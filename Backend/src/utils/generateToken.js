import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'shraddha_gold_luxury_manufacturing_jwt_secret_key_2026', {
    expiresIn: '30d'
  });
};

export default generateToken;
