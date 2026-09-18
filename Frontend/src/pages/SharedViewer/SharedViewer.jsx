import React from 'react';
import CustomerPortal from '../CustomerPortal/CustomerPortal';

/**
 * SharedViewer directly renders the unified CustomerPortal component
 * in shared-link mode to ensure 100% identical UI, design, layout, filters,
 * steppers, cards, and styling with zero code divergence.
 */
const SharedViewer = () => {
  return <CustomerPortal isSharedLink={true} />;
};

export default SharedViewer;
