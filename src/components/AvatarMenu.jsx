import React from 'react';
import './AvatarMenu.css';

// LISTA DE DATOS: Avatares
export const avatars = [
  { 
    id: 1, 
    name: "Rumi Científico", 
    file: "/ruCientifico.glb", 
    img: "/ruCientifico.png", 
    description: "Explora el mundo de la ciencia",
    color: "#4299e1" 
  },
  { 
    id: 2, 
    name: "Rumi Chef", 
    file: "/ruChef.glb", 
    img: "/ruChef.png", 
    description: "Maestro de la gastronomía",
    color: "#ed8936" 
  },
  { 
    id: 3, 
    name: "Rumi Médico", 
    file: "/ruMedico.glb", 
    img: "/ruMedico.png", 
    description: "Cuidando tu salud",
    color: "#48bb78" 
  },
  { 
    id: 4, 
    name: "Rumi Turista", 
    file: "/ruTuristico.glb", 
    img: "/ruTuristico.png", 
    description: "Aventurero del mundo",
    color: "#9f7aea" 
  },
  // 🎄 AVATAR NAVIDEÑO ESPECIAL
  { 
    id: 5, 
    name: "Rumi Navidad", 
    file: "/ruPapaNoel.glb", 
    img: "/ruPapaNoel.png",  
    description: "¡Foto navideña especial!",
    color: "#dc2626",
    isSpecial: true
  },
];

const AvatarMenu = ({ onSelectAvatar }) => {
  return (
    <div className="avatar-menu-container">
      {/* Header */}
      <div className="menu-header">
        <h2 className="menu-title">🎭 Elige tu personaje</h2>
        <p className="menu-subtitle">
          Selecciona un avatar para comenzar tu experiencia AR
        </p>
      </div>

      {/* Grid de avatares */}
      <div className="avatars-grid">
        {avatars.map((avatar) => (
          <div 
            key={avatar.id}
            className={`avatar-card ${avatar.isSpecial ? 'special-card' : ''}`}
            onClick={() => onSelectAvatar(avatar)}
            style={{
              '--avatar-color': avatar.color
            }}
          >
            {/* Badge especial para navidad */}
            {avatar.isSpecial && (
              <div className="special-badge">🎄 Especial</div>
            )}
            
            {/* Badge de ID */}
            <div className="avatar-badge">#{avatar.id}</div>

            {/* Imagen del avatar */}
            <div className="avatar-image-wrapper">
              <img 
                src={avatar.img} 
                alt={avatar.name}
                className="avatar-image"
              />
              <div className="avatar-overlay">
                <span className="overlay-text">👆 Toca aquí</span>
              </div>
            </div>

            {/* Info del avatar */}
            <div className="avatar-info">
              <h3 className="avatar-name">{avatar.name}</h3>
              <p className="avatar-description">
                {avatar.description}
              </p>
            </div>

            {/* Indicador de hover */}
            <div className="avatar-arrow">→</div>
          </div>
        ))}
      </div>

      {/* Footer con stats */}
      <div className="menu-footer">
        <div className="stat-card">
          <span className="stat-icon">🎨</span>
          <span className="stat-text">{avatars.length} Avatares</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📸</span>
          <span className="stat-text">AR Incluido</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✨</span>
          <span className="stat-text">3D Interactivo</span>
        </div>
      </div>
    </div>
  );
};

export default AvatarMenu;