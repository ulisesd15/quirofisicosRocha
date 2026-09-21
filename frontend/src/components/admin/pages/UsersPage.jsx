// frontend/src/components/admin/pages/UsersPage.jsx
//
// Search, filter, edit, verify, and delete user accounts.

import React, { useCallback, useEffect, useState } from "react";

import Modal from "../Modal";
import { showToast } from "../toast";
import { adminApi, formatDate } from "../adminApi";

const EMPTY_EDIT_FORM = {
  id: null,
  fullName: "",
  email: "",
  phone: "",
  role: "user",
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);

      const data = await adminApi(`/api/admin/users?${params}`);
      setUsers(data.users || []);
      setPagination(data.pagination || { currentPage: 1, totalPages: 1 });
    } catch (error) {
      console.error("Error loading users:", error);
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    loadUsers();
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("");
    setPage(1);
  };

  const openEditModal = async (id) => {
    try {
      const data = await adminApi(`/api/admin/users/${id}`);
      const user = data.user;
      setEditForm({
        id: user.id,
        fullName: user.fullName || user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "user",
      });
      setEditModalOpen(true);
    } catch (error) {
      console.error("Error loading user:", error);
      showToast(error.message, "error");
    }
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await adminApi(`/api/admin/users/${editForm.id}`, {
        method: "PUT",
        body: {
          fullName: editForm.fullName,
          email: editForm.email,
          phone: editForm.phone,
          role: editForm.role,
        },
      });
      setEditModalOpen(false);
      showToast("Usuario actualizado correctamente", "success");
      await loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      showToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (id) => {
    try {
      await adminApi(`/api/admin/users/${id}/verify`, { method: "PUT" });
      showToast("Usuario verificado correctamente", "success");
      await loadUsers();
    } catch (error) {
      console.error("Error verifying user:", error);
      showToast(error.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este usuario?"))
      return;

    try {
      await adminApi(`/api/admin/users/${id}`, { method: "DELETE" });
      showToast("Usuario eliminado correctamente", "success");
      await loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast(error.message, "error");
    }
  };

  const handleEditField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const renderPagination = () => {
    const pages = [];
    for (let i = 1; i <= Math.max(pagination.totalPages || 1, 1); i++) {
      pages.push(i);
    }

    return (
      <nav aria-label="Paginación de usuarios">
        <ul className="pagination">
          <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Anterior
            </button>
          </li>
          {pages.map((p) => (
            <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
              <button className="page-link" onClick={() => setPage(p)}>
                {p}
              </button>
            </li>
          ))}
          <li
            className={`page-item ${
              page >= (pagination.totalPages || 1) ? "disabled" : ""
            }`}
          >
            <button
              className="page-link"
              onClick={() =>
                setPage((p) => Math.min(p + 1, pagination.totalPages || 1))
              }
            >
              Siguiente
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  return (
    <div className="admin-section pt-3 pb-5">
      {/* Section Header */}
      <div className="section-header">
        <h2>
          <i className="fas fa-users me-2 text-success" />
          Gestión de Usuarios
        </h2>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="row">
          <div className="col-md-6">
            <label className="form-label fw-bold">Búsqueda</label>
            <form className="input-group" onSubmit={handleSearch}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="btn btn-outline-secondary" type="submit">
                <i className="fas fa-search" />
              </button>
            </form>
          </div>
          <div className="col-md-3">
            <label className="form-label fw-bold">Rol</label>
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => {
                setPage(1);
                setRoleFilter(e.target.value);
              }}
            >
              <option value="">Todos los roles</option>
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="col-md-3 d-flex align-items-end gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary flex-grow-1"
              onClick={clearFilters}
              title="Limpiar filtros"
            >
              <i className="fas fa-times" />
            </button>
            <button
              type="button"
              className="btn btn-primary flex-grow-1"
              onClick={() => loadUsers()}
              title="Actualizar"
            >
              <i className="fas fa-sync-alt" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div className="content-card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fas fa-list me-2" />
            Lista de Usuarios
          </h5>
          <div className="text-muted small">
            Total: {pagination.totalRecords ?? 0} usuarios
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table standard-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Rol</th>
                  <th>Registro</th>
                  <th width="200">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="loading-state">
                      <i className="fas fa-spinner fa-spin" />
                      <div>Cargando usuarios...</div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      <i className="fas fa-users-slash" />
                      <h5>Sin resultados</h5>
                      <p>No se encontraron usuarios.</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.fullName || user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone || "N/A"}</td>
                      <td>
                        <span
                          className={`badge ${
                            user.role === "admin"
                              ? "bg-danger"
                              : "bg-secondary"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            title="Editar"
                            onClick={() => openEditModal(user.id)}
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            className="btn btn-outline-success btn-sm"
                            title="Verificar"
                            onClick={() => handleVerify(user.id)}
                          >
                            <i className="fas fa-user-check" />
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            title="Eliminar"
                            onClick={() => handleDelete(user.id)}
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="standard-pagination">{renderPagination()}</div>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        show={editModalOpen}
        title="Editar Usuario"
        onClose={() => setEditModalOpen(false)}
      >
        <form onSubmit={handleSaveEdit}>
          <div className="mb-3">
            <label className="form-label">Nombre Completo</label>
            <input
              type="text"
              className="form-control"
              value={editForm.fullName}
              onChange={(e) => handleEditField("fullName", e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={editForm.email}
              onChange={(e) => handleEditField("email", e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Teléfono</label>
            <input
              type="tel"
              className="form-control"
              value={editForm.phone}
              onChange={(e) => handleEditField("phone", e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Rol</label>
            <select
              className="form-select"
              value={editForm.role}
              onChange={(e) => handleEditField("role", e.target.value)}
              required
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div className="text-end">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={() => setEditModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <span className="spinner-border spinner-border-sm me-1" />
              ) : (
                <i className="fas fa-save me-1" />
              )}
              Guardar Cambios
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
