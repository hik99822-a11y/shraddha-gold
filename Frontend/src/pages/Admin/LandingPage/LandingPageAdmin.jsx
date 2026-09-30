import React, { useState, useEffect } from 'react';
import { landingPageApi, BASE_URL } from '../../../services/api';
import '../AdminCommon.css';

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // Clean BASE_URL (remove trailing slashes or /api if mistakenly included)
  let base = BASE_URL.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  
  // Prevent replacing 'api' in the middle of a domain name (like api.shraddhagold.com)
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
};

const ImageUploadField = ({ value, onChange, label = 'Image' }) => {
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await landingPageApi.uploadImage(file);
      if (res.success && res.url) {
        onChange(res.url);
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-form-group" style={{ marginBottom: 0 }}>
      {label && <label style={{ display: 'block', marginBottom: '8px' }}>{label}</label>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {value && (
          <img 
            src={getImageUrl(value)} 
            alt="Preview" 
            style={{ width: '100%', height: '140px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #DCE7E4', background: '#fff', padding: '4px' }} 
          />
        )}
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef}
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
        <button 
          type="button" 
          className="btn-outline-brand" 
          style={{ padding: '8px 16px', width: '100%', textAlign: 'center' }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : (value ? 'Change Image' : 'Upload Image')}
        </button>
      </div>
    </div>
  );
};

const LandingPageAdmin = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await landingPageApi.getSettings();
      // The custom fetch wrapper might return JSON directly, or we might need to await .json()
      // Checking other files, if it's returning parsed JSON already, we can just use it.
      // Let's assume `api.js` request wrapper returns parsed json based on typical setups.
      // Oh wait, standard fetch returns a Response. The wrapper in api.js:
      // const res = await fetch(...);
      // return res.json(); 
      // Let's assume it returns parsed data.
      setSettings(res);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleArrayChange = (section, arrayField, index, field, value) => {
    setSettings(prev => {
      const newArray = [...prev[section][arrayField]];
      newArray[index] = { ...newArray[index], [field]: value };
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [arrayField]: newArray
        }
      };
    });
  };

  const addArrayItem = (section, arrayField, defaultItem) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [arrayField]: [...(prev[section][arrayField] || []), defaultItem]
      }
    }));
  };

  const removeArrayItem = (section, arrayField, index) => {
    setSettings(prev => {
      const newArray = [...prev[section][arrayField]];
      newArray.splice(index, 1);
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [arrayField]: newArray
        }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await landingPageApi.updateSettings(settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container">
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading Configuration...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '100%', padding: '0 15px' }}>
      <div 
        className="admin-page-header-banner" 
        style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px', marginBottom: '25px', padding: '15px 0', borderBottom: '1px solid #eee' }}
      >
        <div className="admin-banner-title-group">
          <h1 className="admin-page-title" style={{ margin: 0, fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: '600', color: '#19241A' }}>Manage Content</h1>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="btn-brand" 
          style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: '500', borderRadius: '8px', border: 'none', background: '#5C9396', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.3s', boxShadow: '0 4px 12px rgba(92,147,150,0.2)' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '6px', backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee', color: message.type === 'success' ? '#2e7d32' : '#c62828' }}>
          {message.text}
        </div>
      )}

      <div 
        className="admin-tabs-container hide-scrollbar" 
        style={{ display: 'flex', overflowX: 'auto', gap: '10px', paddingBottom: '15px', marginBottom: '30px', borderBottom: '1px solid #DCE7E4', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          .admin-tabs-container::-webkit-scrollbar { display: none; }
          .admin-custom-tab {
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: 500;
            font-size: 0.95rem;
            color: #666;
            background: #f0f0f0;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .admin-custom-tab.active {
            background: #5C9396;
            color: #fff;
            box-shadow: 0 4px 10px rgba(92,147,150,0.3);
          }
          .admin-custom-tab:hover:not(.active) {
            background: #e0e0e0;
          }
        `}</style>
        {['general', 'hero', 'companyOverview', 'ourValues', 'categories', 'usps', 'exhibitions', 'strengths', 'faqs'].map((tab) => {
          const tabNames = {
            general: 'General & Social',
            hero: 'Hero Slider',
            companyOverview: 'Company Overview',
            ourValues: 'Our Values',
            usps: 'USPs',
            manufacturing: 'Manufacturing',
            exhibitions: 'Exhibitions',
            categories: 'Categories',
            strengths: 'Our Strength',
            faqs: 'FAQs'
          };
          return (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`admin-custom-tab ${activeTab === tab ? 'active' : ''}`}
            >
              {tabNames[tab]}
            </button>
          );
        })}
      </div>

      <div className="admin-card">
        {activeTab === 'general' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="admin-form-group">
              <label>Contact Email</label>
              <input type="email" className="admin-input" value={settings?.general?.contactEmail || ''} onChange={(e) => handleChange('general', 'contactEmail', e.target.value)} />
            </div>
            
            <div className="admin-form-group">
              <label>Contact Phone</label>
              <input type="text" className="admin-input" value={settings?.general?.contactPhone || ''} onChange={(e) => handleChange('general', 'contactPhone', e.target.value)} />
            </div>

            <div className="admin-form-group">
              <label>WhatsApp Number</label>
              <input type="text" className="admin-input" value={settings?.general?.whatsappNumber || ''} onChange={(e) => handleChange('general', 'whatsappNumber', e.target.value)} />
            </div>
            
            <div className="admin-form-group">
              <label>Instagram Link</label>
              <input type="text" className="admin-input" value={settings?.general?.instagramLink || ''} onChange={(e) => handleChange('general', 'instagramLink', e.target.value)} />
            </div>
            
            <div className="admin-form-group">
              <label>Facebook Link</label>
              <input type="text" className="admin-input" value={settings?.general?.facebookLink || ''} onChange={(e) => handleChange('general', 'facebookLink', e.target.value)} />
            </div>
            
            <div className="admin-form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <textarea className="admin-input" value={settings?.general?.address || ''} onChange={(e) => handleChange('general', 'address', e.target.value)} rows="3" />
            </div>

            <div className="admin-form-group" style={{ gridColumn: '1 / -1' }}>
              <h4 style={{ marginTop: '10px', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Footer Settings</h4>
            </div>

            <div className="admin-form-group">
              <label>Footer Company Name</label>
              <input type="text" className="admin-input" value={settings?.general?.footerCompanyName || ''} onChange={(e) => handleChange('general', 'footerCompanyName', e.target.value)} />
            </div>

            <div className="admin-form-group">
              <label>Footer Copyright Text</label>
              <input type="text" className="admin-input" value={settings?.general?.footerCopyrightText || ''} onChange={(e) => handleChange('general', 'footerCopyrightText', e.target.value)} />
            </div>

            <div className="admin-form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Footer Description</label>
              <textarea className="admin-input" value={settings?.general?.footerDescription || ''} onChange={(e) => handleChange('general', 'footerDescription', e.target.value)} rows="3" />
            </div>
          </div>
        )}

        {activeTab === 'hero' && (
          <div>
            {(settings?.hero?.slides || []).map((slide, index) => (
            <div key={index} style={{ background: '#F7FAF9', border: '1px solid #DCE7E4', padding: '56px 24px 24px 24px', marginBottom: '20px', borderRadius: '12px', position: 'relative', boxShadow: '0 2px 8px rgba(25,36,26,0.03)' }}>
                <button onClick={() => removeArrayItem('hero', 'slides', index)} className="btn-danger" style={{ position: 'absolute', top: '20px', right: '24px', padding: '6px 12px', fontSize: '0.8rem' }}>Remove</button>
                <div className="admin-form-group">
                  <label>Title</label>
                  <input type="text" className="admin-input" value={slide.title || ''} onChange={(e) => handleArrayChange('hero', 'slides', index, 'title', e.target.value)} />
                </div>
                <div className="admin-form-group">
                  <label>Subtitle</label>
                  <input type="text" className="admin-input" value={slide.subtitle || ''} onChange={(e) => handleArrayChange('hero', 'slides', index, 'subtitle', e.target.value)} />
                </div>
                <ImageUploadField 
                  label="Image"
                  value={slide.image} 
                  onChange={(val) => handleArrayChange('hero', 'slides', index, 'image', val)} 
                />
              </div>
            ))}
            <button onClick={() => addArrayItem('hero', 'slides', { title: '', subtitle: '', image: '' })} className="btn-outline-brand w-full mt-4">+ Add Slide</button>
          </div>
        )}

        {activeTab === 'companyOverview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            <div className="admin-form-group">
              <label>Section Title</label>
              <input type="text" className="admin-input" value={settings?.companyOverview?.title || ''} onChange={(e) => handleChange('companyOverview', 'title', e.target.value)} />
            </div>
            
            <div className="admin-form-group">
              <label>Description</label>
              <textarea className="admin-input" value={settings?.companyOverview?.description || ''} onChange={(e) => handleChange('companyOverview', 'description', e.target.value)} rows="6" />
              <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>Tip: Wrap text in asterisks to highlight it (e.g. *18kt Gold*)</small>
            </div>
            
            <ImageUploadField 
              label="Image"
              value={settings?.companyOverview?.image} 
              onChange={(val) => handleChange('companyOverview', 'image', val)} 
            />
          </div>
        )}

        {activeTab === 'ourValues' && (
          <div>
            {(settings?.ourValues?.items || []).map((item, index) => (
              <div key={index} style={{ background: '#F7FAF9', border: '1px solid #DCE7E4', padding: '56px 24px 24px 24px', marginBottom: '20px', borderRadius: '12px', position: 'relative', boxShadow: '0 2px 8px rgba(25,36,26,0.03)' }}>
                <button onClick={() => removeArrayItem('ourValues', 'items', index)} className="btn-danger" style={{ position: 'absolute', top: '20px', right: '24px', padding: '6px 12px', fontSize: '0.8rem' }}>Remove</button>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '20px' }}>
                  <div className="admin-form-group">
                    <label>Number</label>
                    <input type="text" className="admin-input" placeholder="e.g. 01" value={item.number || ''} onChange={(e) => handleArrayChange('ourValues', 'items', index, 'number', e.target.value)} />
                  </div>
                  <div className="admin-form-group">
                    <label>Title</label>
                    <input type="text" className="admin-input" placeholder="e.g. VISION" value={item.title || ''} onChange={(e) => handleArrayChange('ourValues', 'items', index, 'title', e.target.value)} />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label>Subtitle / Tags</label>
                  <input type="text" className="admin-input" placeholder="e.g. TRUST | INNOVATE" value={item.subtitle || ''} onChange={(e) => handleArrayChange('ourValues', 'items', index, 'subtitle', e.target.value)} />
                </div>
                <div className="admin-form-group">
                  <label>Description</label>
                  <textarea className="admin-input" value={item.description || ''} onChange={(e) => handleArrayChange('ourValues', 'items', index, 'description', e.target.value)} rows="3" />
                </div>
              </div>
            ))}
            <button onClick={() => addArrayItem('ourValues', 'items', { number: '', title: '', subtitle: '', description: '' })} className="btn-outline-brand w-full mt-4">+ Add Value Item</button>
          </div>
        )}

        {activeTab === 'usps' && (
          <div>
            {(settings?.usps?.items || []).map((item, index) => (
            <div key={index} style={{ background: '#F7FAF9', border: '1px solid #DCE7E4', padding: '56px 24px 24px 24px', marginBottom: '20px', borderRadius: '12px', position: 'relative', boxShadow: '0 2px 8px rgba(25,36,26,0.03)' }}>
                <button onClick={() => removeArrayItem('usps', 'items', index)} className="btn-danger" style={{ position: 'absolute', top: '20px', right: '24px', padding: '6px 12px', fontSize: '0.8rem' }}>Remove</button>
                <div className="admin-form-group">
                  <label>Title</label>
                  <input type="text" className="admin-input" value={item.title || ''} onChange={(e) => handleArrayChange('usps', 'items', index, 'title', e.target.value)} />
                </div>
                <div className="admin-form-group">
                  <label>Description</label>
                  <textarea className="admin-input" value={item.description || ''} onChange={(e) => handleArrayChange('usps', 'items', index, 'description', e.target.value)} rows="3" />
                </div>
                <ImageUploadField 
                  label="Icon/Image"
                  value={item.image} 
                  onChange={(val) => handleArrayChange('usps', 'items', index, 'image', val)} 
                />
              </div>
            ))}
            <button onClick={() => addArrayItem('usps', 'items', { title: '', description: '', image: '' })} className="btn-outline-brand w-full mt-4">+ Add USP</button>
          </div>
        )}

        {activeTab === 'manufacturing' && (
          <div>
            <h3>Manufacturing Steps</h3>
            {(settings?.manufacturing?.steps || []).map((step, index) => (
            <div key={index} style={{ background: '#F7FAF9', border: '1px solid #DCE7E4', padding: '56px 24px 24px 24px', marginBottom: '20px', borderRadius: '12px', position: 'relative', boxShadow: '0 2px 8px rgba(25,36,26,0.03)' }}>
                <button onClick={() => removeArrayItem('manufacturing', 'steps', index)} className="btn-danger" style={{ position: 'absolute', top: '20px', right: '24px', padding: '6px 12px', fontSize: '0.8rem' }}>Remove</button>
                <div className="admin-form-group">
                  <label>Title</label>
                  <input type="text" className="admin-input" value={step.title || ''} onChange={(e) => handleArrayChange('manufacturing', 'steps', index, 'title', e.target.value)} />
                </div>
                <div className="admin-form-group">
                  <label>Description</label>
                  <textarea className="admin-input" value={step.description || ''} onChange={(e) => handleArrayChange('manufacturing', 'steps', index, 'description', e.target.value)} rows="3" />
                </div>
                <ImageUploadField 
                  label="Image"
                  value={step.image} 
                  onChange={(val) => handleArrayChange('manufacturing', 'steps', index, 'image', val)} 
                />
              </div>
            ))}
            <button onClick={() => addArrayItem('manufacturing', 'steps', { title: '', description: '', image: '' })} className="btn-outline-brand w-full mt-4">+ Add Step</button>
          </div>
        )}

        {activeTab === 'exhibitions' && (
          <div>
            {(settings?.exhibitions?.images || []).map((imgUrl, index) => (
              <div key={index} style={{ background: '#F7FAF9', border: '1px solid #DCE7E4', padding: '56px 24px 24px 24px', marginBottom: '20px', borderRadius: '12px', position: 'relative' }}>
                <button onClick={() => {
                   const newImages = [...(settings?.exhibitions?.images || [])];
                   newImages.splice(index, 1);
                   handleChange('exhibitions', 'images', newImages);
                }} className="btn-danger" style={{ position: 'absolute', top: '20px', right: '24px', padding: '6px 12px', fontSize: '0.8rem' }}>Remove</button>
                <ImageUploadField 
                  label={`Image ${index + 1}`}
                  value={imgUrl} 
                  onChange={(val) => {
                     const newImages = [...(settings?.exhibitions?.images || [])];
                     newImages[index] = val;
                     handleChange('exhibitions', 'images', newImages);
                  }} 
                />
              </div>
            ))}
            <button onClick={() => {
                const newImages = [...(settings?.exhibitions?.images || []), ''];
                handleChange('exhibitions', 'images', newImages);
            }} className="btn-outline-brand w-full mt-2 mb-6">+ Add New Image</button>

            {(settings?.exhibitions?.events || []).map((event, index) => (
            <div key={index} style={{ background: '#F7FAF9', border: '1px solid #DCE7E4', padding: '56px 24px 24px 24px', marginBottom: '20px', borderRadius: '12px', position: 'relative', boxShadow: '0 2px 8px rgba(25,36,26,0.03)' }}>
                <button onClick={() => removeArrayItem('exhibitions', 'events', index)} className="btn-danger" style={{ position: 'absolute', top: '20px', right: '24px', padding: '6px 12px', fontSize: '0.8rem' }}>Remove</button>
                <div className="admin-form-group">
                  <label>Event Title</label>
                  <input type="text" className="admin-input" value={event.title || ''} onChange={(e) => handleArrayChange('exhibitions', 'events', index, 'title', e.target.value)} />
                </div>
                <div className="admin-form-group">
                  <label>Description (Date/Location)</label>
                  <textarea className="admin-input" value={event.description || ''} onChange={(e) => handleArrayChange('exhibitions', 'events', index, 'description', e.target.value)} rows="3" />
                </div>
              </div>
            ))}
            <button onClick={() => addArrayItem('exhibitions', 'events', { title: '', description: '' })} className="btn-outline-brand w-full mt-4">+ Add Event</button>
          </div>
        )}

        {activeTab === 'categories' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div className="admin-form-group">
                <label>Section Title</label>
                <input type="text" className="admin-input" value={settings?.featuredCategories?.title || ''} onChange={(e) => handleChange('featuredCategories', 'title', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label>Section Subtitle</label>
                <input type="text" className="admin-input" value={settings?.featuredCategories?.subtitle || ''} onChange={(e) => handleChange('featuredCategories', 'subtitle', e.target.value)} />
              </div>
              <div className="admin-form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Section Description</label>
                <textarea className="admin-input" value={settings?.featuredCategories?.description || ''} onChange={(e) => handleChange('featuredCategories', 'description', e.target.value)} rows="3" />
              </div>
            </div>

            <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Category Items</h3>
            {(settings?.featuredCategories?.categories || []).map((cat, index) => (
            <div key={index} style={{ background: '#F7FAF9', border: '1px solid #DCE7E4', padding: '56px 24px 24px 24px', marginBottom: '20px', borderRadius: '12px', position: 'relative', boxShadow: '0 2px 8px rgba(25,36,26,0.03)' }}>
                <button onClick={() => removeArrayItem('featuredCategories', 'categories', index)} className="btn-danger" style={{ position: 'absolute', top: '20px', right: '24px', padding: '6px 12px', fontSize: '0.8rem' }}>Remove</button>
                <div className="admin-form-group">
                  <label>Category Name</label>
                  <input type="text" className="admin-input" value={cat.name || ''} onChange={(e) => handleArrayChange('featuredCategories', 'categories', index, 'name', e.target.value)} />
                </div>
                <div style={{ marginTop: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.95rem', fontWeight: '500', color: '#19241A' }}>Category Images</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                    {(cat.images || []).map((imgUrl, imgIndex) => (
                      <div key={imgIndex} style={{ border: '1px solid #DCE7E4', padding: '12px', borderRadius: '8px', background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#666' }}>Image {imgIndex + 1}</span>
                          <button 
                            onClick={() => {
                               const newImages = [...(cat.images || [])];
                               newImages.splice(imgIndex, 1);
                               handleArrayChange('featuredCategories', 'categories', index, 'images', newImages);
                            }} 
                            className="btn-danger" 
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                          >
                            Remove
                          </button>
                        </div>
                        <ImageUploadField 
                          label=""
                          value={imgUrl} 
                          onChange={(val) => {
                             const newImages = [...(cat.images || [])];
                             newImages[imgIndex] = val;
                             handleArrayChange('featuredCategories', 'categories', index, 'images', newImages);
                          }} 
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #5C9396', borderRadius: '8px', padding: '10px', background: 'rgba(92,147,150,0.05)', minHeight: '220px' }}>
                      <button onClick={() => {
                          const newImages = [...(cat.images || []), ''];
                          handleArrayChange('featuredCategories', 'categories', index, 'images', newImages);
                      }} className="btn-outline-brand w-full" style={{ height: '100%', border: 'none', background: 'transparent' }}>+ Add Image</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => addArrayItem('featuredCategories', 'categories', { name: '', images: [] })} className="btn-outline-brand w-full mt-4">+ Add Category</button>
          </div>
        )}

        {activeTab === 'strengths' && (
          <div>
            <h3>Our Strength</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div className="admin-form-group">
                <label>Section Title</label>
                <input type="text" className="admin-input" value={settings?.strengths?.title || ''} onChange={(e) => handleChange('strengths', 'title', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label>Section Subtitle</label>
                <input type="text" className="admin-input" value={settings?.strengths?.subtitle || ''} onChange={(e) => handleChange('strengths', 'subtitle', e.target.value)} />
              </div>
            </div>
            
            <h4>Strength Items</h4>
            {(settings?.strengths?.items || []).map((item, index) => (
            <div key={index} style={{ background: '#F7FAF9', border: '1px solid #DCE7E4', padding: '56px 24px 24px 24px', marginBottom: '20px', borderRadius: '12px', position: 'relative', boxShadow: '0 2px 8px rgba(25,36,26,0.03)' }}>
                <button onClick={() => removeArrayItem('strengths', 'items', index)} className="btn-danger" style={{ position: 'absolute', top: '20px', right: '24px', padding: '6px 12px', fontSize: '0.8rem' }}>Remove</button>
                <div className="admin-form-group">
                  <label>Title</label>
                  <input type="text" className="admin-input" value={item.title || ''} onChange={(e) => handleArrayChange('strengths', 'items', index, 'title', e.target.value)} />
                </div>
                <div className="admin-form-group" style={{ marginTop: '15px' }}>
                  <label>Description</label>
                  <textarea className="admin-input" value={item.description || ''} onChange={(e) => handleArrayChange('strengths', 'items', index, 'description', e.target.value)} rows="3" />
                </div>
              </div>
            ))}
            <button onClick={() => addArrayItem('strengths', 'items', { title: '', description: '' })} className="btn-outline-brand w-full mt-4">+ Add Strength</button>
          </div>
        )}

        {activeTab === 'faqs' && (
          <div>
            <h3>Frequently Asked Questions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div className="admin-form-group">
                <label>Section Title</label>
                <input type="text" className="admin-input" value={settings?.faqs?.title || ''} onChange={(e) => handleChange('faqs', 'title', e.target.value)} />
              </div>
              <div className="admin-form-group">
                <label>Section Subtitle</label>
                <input type="text" className="admin-input" value={settings?.faqs?.subtitle || ''} onChange={(e) => handleChange('faqs', 'subtitle', e.target.value)} />
              </div>
            </div>
            
            <h4>Questions & Answers</h4>
            {(settings?.faqs?.items || []).map((faq, index) => (
            <div key={index} style={{ background: '#F7FAF9', border: '1px solid #DCE7E4', padding: '56px 24px 24px 24px', marginBottom: '20px', borderRadius: '12px', position: 'relative', boxShadow: '0 2px 8px rgba(25,36,26,0.03)' }}>
                <button onClick={() => removeArrayItem('faqs', 'items', index)} className="btn-danger" style={{ position: 'absolute', top: '20px', right: '24px', padding: '6px 12px', fontSize: '0.8rem' }}>Remove</button>
                <div className="admin-form-group">
                  <label>Question</label>
                  <input type="text" className="admin-input" value={faq.question || ''} onChange={(e) => handleArrayChange('faqs', 'items', index, 'question', e.target.value)} />
                </div>
                <div className="admin-form-group">
                  <label>Answer</label>
                  <textarea className="admin-input" value={faq.answer || ''} onChange={(e) => handleArrayChange('faqs', 'items', index, 'answer', e.target.value)} rows="3" />
                </div>
              </div>
            ))}
            <button onClick={() => addArrayItem('faqs', 'items', { question: '', answer: '' })} className="btn-outline-brand w-full mt-4">+ Add FAQ</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPageAdmin;
