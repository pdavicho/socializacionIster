import React, { useEffect, useState } from 'react';
import { db, storage } from '../firebase-config';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import './Gallery.css';

const Gallery = ({ onBack }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [filterAvatar, setFilterAvatar] = useState('all');
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const ADMIN_PASSWORD = "investigacion2025"; // Cambia esto si quieres

  // Lista de avatares para filtros
  const avatars = [
    { name: "Rumi Científico" },
    { name: "Rumi Chef" },
    { name: "Rumi Médico" },
    { name: "Rumi Turista" },
  ];

  // Cargar fotos en tiempo real
  useEffect(() => {
    const q = query(collection(db, "galeria"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const photosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPhotos(photosData);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando galería:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtrar fotos por avatar
  const filteredPhotos = filterAvatar === 'all' 
    ? photos 
    : photos.filter(photo => photo.avatar === filterAvatar);

  // Abrir modal de foto
  const openPhotoModal = (photo) => {
    setSelectedPhoto(photo);
    document.body.style.overflow = 'hidden';
  };

  // Cerrar modal
  const closePhotoModal = () => {
    setSelectedPhoto(null);
    document.body.style.overflow = 'auto';
  };

  // Descargar foto
  const downloadPhoto = async (url, photoId) => {
  try {
    // Método 1: Intentar descarga directa
    const link = document.createElement('a');
    link.href = url;
    link.download = `RumiAR_${photoId}.jpg`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Agregar al DOM temporalmente
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Dar feedback al usuario
    setTimeout(() => {
      alert('📥 Descarga iniciada. Revisa tu carpeta de Descargas.');
    }, 500);

  } catch (error) {
    console.error('Error descargando foto:', error);
    
    // Método alternativo: Abrir en nueva pestaña
    try {
      window.open(url, '_blank');
      alert('✨ Foto abierta en nueva pestaña. Usa "Guardar imagen como..." para descargarla.');
    } catch (err) {
      alert('❌ No se pudo descargar. Intenta mantener presionada la imagen y selecciona "Guardar imagen".');
    }
  }
};

  // Activar modo admin
  const enableAdminMode = () => {
    const password = prompt("🔒 Ingresa la contraseña de administrador:");
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      alert("✅ Modo administrador activado");
    } else if (password) {
      alert("❌ Contraseña incorrecta");
    }
  };

  // Eliminar foto
  const deletePhoto = async (photo) => {
    if (!isAdmin) {
      alert("🔒 Solo administradores pueden eliminar fotos");
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar esta foto con ${photo.avatar}?\n\nEsta acción no se puede deshacer.`
    );
    
    if (!confirmDelete) return;

    setDeleting(true);

    try {
      const urlParts = photo.url.split('/');
      const filePathEncoded = urlParts[urlParts.length - 1].split('?')[0];
      const filePath = decodeURIComponent(filePathEncoded);
      const fileName = filePath.split('/').pop();

      const storageRef = ref(storage, `fotos_feria/${fileName}`);
      await deleteObject(storageRef);

      await deleteDoc(doc(db, "galeria", photo.id));

      if (selectedPhoto?.id === photo.id) {
        closePhotoModal();
      }

      alert("✅ Foto eliminada exitosamente");

    } catch (error) {
      console.error("Error al eliminar:", error);
      
      let errorMessage = "❌ Error al eliminar la foto. ";
      if (error.code === 'storage/object-not-found') {
        errorMessage += "El archivo ya no existe en el servidor.";
        try {
          await deleteDoc(doc(db, "galeria", photo.id));
          alert("⚠️ Foto eliminada de la galería (el archivo ya no existía)");
        } catch (firestoreError) {
          alert(errorMessage);
        }
      } else if (error.code === 'storage/unauthorized') {
        errorMessage += "No tienes permisos para eliminar.";
        alert(errorMessage);
      } else {
        alert(errorMessage + "Intenta de nuevo.");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="gallery-container">
      {/* Header simplificado */}
      <div className="gallery-header">
        <h1 className="gallery-title">Investigación 2025</h1>
        <div className="header-right">
          <div className="photo-count">
            {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
          </div>
          {!isAdmin && (
            <button onClick={enableAdminMode} className="admin-btn" title="Modo Administrador">
              🔒
            </button>
          )}
          {isAdmin && (
            <span className="admin-badge">👑 Admin</span>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="filter-section">
        <button 
          className={`filter-btn ${filterAvatar === 'all' ? 'active' : ''}`}
          onClick={() => setFilterAvatar('all')}
        >
          Todos ({photos.length})
        </button>
        {avatars.map((avatar) => {
          const count = photos.filter(p => p.avatar === avatar.name).length;
          return (
            <button 
              key={avatar.name}
              className={`filter-btn ${filterAvatar === avatar.name ? 'active' : ''}`}
              onClick={() => setFilterAvatar(avatar.name)}
            >
              {avatar.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid de Fotos */}
      <div className="photos-section">
        {loading ? (
          <div className="photos-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="photo-skeleton" />
            ))}
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📷</div>
            <h3>No hay fotos aún</h3>
            <p>
              {filterAvatar === 'all' 
                ? 'Sé el primero en tomar una foto con los avatares'
                : `No hay fotos con ${filterAvatar}`
              }
            </p>
          </div>
        ) : (
          <div className="photos-grid">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="photo-card">
                {isAdmin && (
                  <button 
                    className="delete-photo-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePhoto(photo);
                    }}
                    disabled={deleting}
                    title="Eliminar foto"
                  >
                    🗑️
                  </button>
                )}

                <div onClick={() => openPhotoModal(photo)}>
                  <img 
                    src={photo.url} 
                    alt={`Foto con ${photo.avatar}`}
                    loading="lazy"
                    className="photo-image"
                  />
                  <div className="photo-overlay">
                    <span className="photo-avatar-tag">
                      {photo.avatar}
                    </span>
                    <span className="photo-view-icon">🔍</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de foto completa - MEJORADO */}
{selectedPhoto && (
  <div className="photo-modal" onClick={closePhotoModal}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      {/* Botón cerrar MEJORADO - siempre visible */}
      <button 
        className="modal-close" 
        onClick={closePhotoModal}
        aria-label="Cerrar"
      >
        ✕
      </button>
      
      <div className="modal-image-container">
        <img 
          src={selectedPhoto.url} 
          alt={`Foto con ${selectedPhoto.avatar}`}
          className="modal-image"
        />
      </div>
      
      <div className="modal-info">
        <h3 className="modal-photo-title">📸 Foto con {selectedPhoto.avatar}</h3>
        <p className="modal-date">
          {selectedPhoto.createdAt?.toDate().toLocaleString('es-EC', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
        
        <div className="modal-actions">
          <button 
            className="modal-btn download"
            onClick={() => downloadPhoto(selectedPhoto.url, selectedPhoto.id)}
          >
            ⬇️ Descargar
          </button>
          <a 
            href={selectedPhoto.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="modal-btn view"
          >
            🔗 Abrir
          </a>
          {isAdmin && (
            <button 
              className="modal-btn delete"
              onClick={() => deletePhoto(selectedPhoto)}
              disabled={deleting}
            >
              {deleting ? '⏳' : '🗑️'}
            </button>
          )}
        </div>

        {/* Botón de cerrar adicional en móvil */}
        <button 
          className="modal-close-bottom"
          onClick={closePhotoModal}
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Gallery;