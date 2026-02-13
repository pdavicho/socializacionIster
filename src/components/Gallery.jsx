import React, { useEffect, useState } from 'react';
import { db, storage } from '../firebase-config';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp, getDocs, where, writeBatch } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import './Gallery.css';

const Gallery = ({ onBack }) => {
  const [photos, setPhotos] = useState([]);
  const [carpetas, setCarpetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCarpetas, setLoadingCarpetas] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [filterAvatar, setFilterAvatar] = useState('all');
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeCarpeta, setActiveCarpeta] = useState(null); // null = vista de carpetas

  const ADMIN_PASSWORD = "investigacion2025";

  const avatars = [
    { name: "Rumi Científico" },
    { name: "Rumi Chef" },
    { name: "Rumi Médico" },
    { name: "Rumi Turista" },
  ];

  // Cargar carpetas en tiempo real
  useEffect(() => {
    const q = query(collection(db, "carpetas"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCarpetas(data);
      setLoadingCarpetas(false);
    }, (error) => {
      console.error("Error cargando carpetas:", error);
      setLoadingCarpetas(false);
    });
    return () => unsubscribe();
  }, []);

  // Cargar fotos en tiempo real
  useEffect(() => {
    const q = query(collection(db, "galeria"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const photosData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPhotos(photosData);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando galería:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fotos de la carpeta activa, filtradas por avatar
  const carpetaPhotos = activeCarpeta
    ? photos.filter(p => p.carpetaId === activeCarpeta.id)
    : [];

  const filteredPhotos = filterAvatar === 'all'
    ? carpetaPhotos
    : carpetaPhotos.filter(p => p.avatar === filterAvatar);

  // Contar fotos por carpeta
  const getPhotoCount = (carpetaId) => photos.filter(p => p.carpetaId === carpetaId).length;

  // Preview: última foto de la carpeta
  const getPreviewUrl = (carpetaId) => {
    const foto = photos.find(p => p.carpetaId === carpetaId);
    return foto ? foto.url : null;
  };

  const openPhotoModal = (photo) => {
    setSelectedPhoto(photo);
    document.body.style.overflow = 'hidden';
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
    document.body.style.overflow = 'auto';
  };

  const downloadPhoto = async (url, photoId) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `RumiAR_${photoId}.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => {
        alert('Descarga iniciada. Revisa tu carpeta de Descargas.');
      }, 500);
    } catch (error) {
      console.error('Error descargando foto:', error);
      try {
        window.open(url, '_blank');
        alert('Foto abierta en nueva ventana. Usa "Guardar imagen como..." para descargarla.');
      } catch (err) {
        alert('No se pudo descargar. Intenta mantener presionada la imagen y selecciona "Guardar imagen".');
      }
    }
  };

  const enableAdminMode = () => {
    const password = prompt("Ingresa la clave de administrador:");
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      alert("Modo administrador activado");
    } else if (password) {
      alert("Clave incorrecta");
    }
  };

  // Crear carpeta (admin)
  const createCarpeta = async () => {
    const name = prompt("Nombre de la nueva carpeta:");
    if (!name || !name.trim()) return;
    try {
      await addDoc(collection(db, "carpetas"), {
        name: name.trim(),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error creando carpeta:", error);
      alert("Error al crear la carpeta. Intenta de nuevo.");
    }
  };

  // Eliminar carpeta y sus fotos (admin)
  const deleteCarpeta = async (carpeta) => {
    const count = getPhotoCount(carpeta.id);
    const confirmMsg = count > 0
      ? `Eliminar "${carpeta.name}" y sus ${count} foto(s)? Esta accion no se puede deshacer.`
      : `Eliminar la carpeta "${carpeta.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      // Eliminar fotos de la carpeta
      const fotosQ = query(collection(db, "galeria"), where("carpetaId", "==", carpeta.id));
      const fotosSnap = await getDocs(fotosQ);
      const batch = writeBatch(db);

      for (const fotoDoc of fotosSnap.docs) {
        const fotoData = fotoDoc.data();
        // Intentar eliminar archivo de Storage
        try {
          const urlParts = fotoData.url.split('/');
          const filePathEncoded = urlParts[urlParts.length - 1].split('?')[0];
          const filePath = decodeURIComponent(filePathEncoded);
          const fileName = filePath.split('/').pop();
          const storageRef = ref(storage, `fotos_feria/${fileName}`);
          await deleteObject(storageRef);
        } catch (e) {
          console.warn("No se pudo eliminar archivo:", e);
        }
        batch.delete(doc(db, "galeria", fotoDoc.id));
      }

      batch.delete(doc(db, "carpetas", carpeta.id));
      await batch.commit();

      if (activeCarpeta?.id === carpeta.id) {
        setActiveCarpeta(null);
      }
      alert("Carpeta eliminada");
    } catch (error) {
      console.error("Error eliminando carpeta:", error);
      alert("Error al eliminar la carpeta.");
    }
  };

  // Eliminar foto
  const deletePhoto = async (photo) => {
    if (!isAdmin) {
      alert("Solo administradores pueden eliminar fotos");
      return;
    }

    const confirmDelete = window.confirm(
      `Eliminar esta foto con ${photo.avatar}?\n\nEsta accion no se puede deshacer.`
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
      alert("Foto eliminada exitosamente");
    } catch (error) {
      console.error("Error al eliminar:", error);
      let errorMessage = "Error al eliminar la foto. ";
      if (error.code === 'storage/object-not-found') {
        errorMessage += "El archivo ya no existe en el servidor.";
        try {
          await deleteDoc(doc(db, "galeria", photo.id));
          alert("Foto eliminada de la galeria (el archivo ya no existia)");
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

  // ==========================================
  // RENDER: Vista de carpetas (principal)
  // ==========================================
  if (!activeCarpeta) {
    return (
      <div className="gallery-container">
        <div className="gallery-header">
          <h1 className="gallery-title">Galeria</h1>
          <div className="header-right">
            {!isAdmin && (
              <button onClick={enableAdminMode} className="admin-btn" title="Modo Administrador">
                🔒
              </button>
            )}
            {isAdmin && (
              <span className="admin-badge">Admin</span>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="folder-actions">
            <button className="create-folder-btn" onClick={createCarpeta}>
              + Nueva Carpeta
            </button>
          </div>
        )}

        <div className="folder-section">
          {loadingCarpetas ? (
            <div className="folder-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="folder-skeleton" />
              ))}
            </div>
          ) : carpetas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>No hay carpetas</h3>
              <p>
                {isAdmin
                  ? 'Crea una carpeta para empezar a organizar las fotos'
                  : 'Un administrador debe crear carpetas primero'}
              </p>
            </div>
          ) : (
            <div className="folder-grid">
              {carpetas.map((carpeta) => {
                const count = getPhotoCount(carpeta.id);
                const preview = getPreviewUrl(carpeta.id);
                return (
                  <div
                    key={carpeta.id}
                    className="folder-card"
                    onClick={() => {
                      setActiveCarpeta(carpeta);
                      setFilterAvatar('all');
                    }}
                  >
                    {isAdmin && (
                      <button
                        className="delete-folder-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCarpeta(carpeta);
                        }}
                        title="Eliminar carpeta"
                      >
                        🗑️
                      </button>
                    )}
                    <div className="folder-preview">
                      {preview ? (
                        <img src={preview} alt={carpeta.name} loading="lazy" />
                      ) : (
                        <div className="folder-empty-preview">📁</div>
                      )}
                    </div>
                    <div className="folder-info">
                      <h3 className="folder-name">{carpeta.name}</h3>
                      <span className="folder-count">
                        {count} {count === 1 ? 'foto' : 'fotos'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Vista de fotos dentro de carpeta
  // ==========================================
  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <button className="back-btn" onClick={() => setActiveCarpeta(null)}>
          ← Volver
        </button>
        <h1 className="gallery-title">{activeCarpeta.name}</h1>
        <div className="header-right">
          <div className="photo-count">
            {carpetaPhotos.length} {carpetaPhotos.length === 1 ? 'foto' : 'fotos'}
          </div>
          {!isAdmin && (
            <button onClick={enableAdminMode} className="admin-btn" title="Modo Administrador">
              🔒
            </button>
          )}
          {isAdmin && (
            <span className="admin-badge">Admin</span>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="filter-section">
        <button
          className={`filter-btn ${filterAvatar === 'all' ? 'active' : ''}`}
          onClick={() => setFilterAvatar('all')}
        >
          Todos ({carpetaPhotos.length})
        </button>
        {avatars.map((avatar) => {
          const count = carpetaPhotos.filter(p => p.avatar === avatar.name).length;
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
            <h3>No hay fotos</h3>
            <p>
              {filterAvatar === 'all'
                ? 'Esta carpeta aun no tiene fotos'
                : `No hay fotos con ${filterAvatar} en esta carpeta`
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
                    <span className="photo-avatar-tag">{photo.avatar}</span>
                    <span className="photo-view-icon">🔍</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de foto completa */}
      {selectedPhoto && (
        <div className="photo-modal" onClick={closePhotoModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closePhotoModal} aria-label="Cerrar">
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
              <h3 className="modal-photo-title">Foto con {selectedPhoto.avatar}</h3>
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
                  Descargar
                </button>
                <a
                  href={selectedPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-btn view"
                >
                  Abrir
                </a>
                {isAdmin && (
                  <button
                    className="modal-btn delete"
                    onClick={() => deletePhoto(selectedPhoto)}
                    disabled={deleting}
                  >
                    {deleting ? 'Eliminando...' : 'Eliminar'}
                  </button>
                )}
              </div>
              <button className="modal-close-bottom" onClick={closePhotoModal}>
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
