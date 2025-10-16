// Configuración de la API
const API_URL = 'src/controllers/api.php';

// Variables globales
let currentEditId = null;
let noticiaModal = null;
let confirmModal = null;
let currentQuery = '';
const selectedIds = new Set();
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTS = ['jpg','jpeg','png','gif'];
const ALLOWED_MIMES = ['image/jpeg','image/png','image/gif'];

const noticiaModalEl = document.getElementById('noticiaModal');

noticiaModalEl.addEventListener('hide.bs.modal', () => {
    const form = document.getElementById('noticiaForm');
    clearFormValidation(form);
    const ae = document.activeElement;
    if (ae && noticiaModalEl.contains(ae)) {
        ae.blur();
    }
});

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar modales de Bootstrap
    noticiaModal = new bootstrap.Modal(document.getElementById('noticiaModal'));
    confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    
    // Cargar noticias al inicio
    const input = document.getElementById('filtroTitulo');
    if (input) {
        const debounced = debounce(() => {
        currentQuery = input.value.trim();
        loadNoticias();
        }, 300);
        input.addEventListener('input', debounced);
    }
    loadNoticias();
    
    // Establecer fecha actual por defecto
    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
});

function debounce(fn, delay) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(null, args), delay);
    };
}

function clearFiltro() {
    const input = document.getElementById('filtroTitulo');
    if (input) { input.value = ''; }
    currentQuery = '';
    loadNoticias();
}

/**
 * Cargar todas las noticias
 */
async function loadNoticias() {
    showLoading(true);
    
    try {
        const url = currentQuery ? `${API_URL}?q=${encodeURIComponent(currentQuery)}` : API_URL;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data || [];
            patchNoticiasIncremental(data);
        } else {
            showError('Error al cargar las noticias: ' + result.error);
        }
    } catch (error) {
        showError('Error de conexión: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Campos noticias en lista
function noticiaHash(n) {
    return JSON.stringify({
        id: Number(n.id),
        titulo: n.titulo ?? '',
        descripcion: n.descripcion ?? '',
        miniatura: n.miniatura ?? '',
        fecha: n.fecha ?? '',
        fuente: n.fuente ?? '',
    });
}

// Construir una fila <tr>
function buildRow(n) {
    const tr = document.createElement('tr');
    tr.dataset.id = String(n.id);
    tr.dataset.hash = noticiaHash(n);
    tr.innerHTML = `
        <td class="text-center">
            <input type="checkbox" class="form-check-input row-check" ${selectedIds.has(String(n.id))?'checked':''} />
        </td>
        <td class="text-center">
        ${n.miniatura
            ? `<img src="uploads/${n.miniatura}" class="thumbnail-preview" alt="${escapeHtml(n.titulo ?? '')}">`
            : `<div class="d-flex align-items-center justify-content-center" style="width:80px;height:80px;background:#f8f9fa;border-radius:4px;">
                <i class="fas fa-image fa-2x text-muted"></i>
            </div>`}
        </td>
        <td><strong>${escapeHtml(n.titulo ?? '')}</strong></td>
        <td class="description-cell">
        <span title="${escapeHtml(n.descripcion ?? '')}">
            ${escapeHtml((n.descripcion ?? '').substring(0,80))}${(n.descripcion ?? '').length > 80 ? '...' : ''}
        </span>
        </td>
        <td><i class="fas fa-calendar text-muted"></i> ${formatDate(n.fecha)}</td>
        <td><i class="fas fa-newspaper text-muted"></i> ${escapeHtml(n.fuente ?? '')}</td>
        <td class="actions-cell">
        <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="editNoticia(${Number(n.id) || 0})" title="Editar">
            <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger" onclick="confirmDelete(${Number(n.id) || 0}, '${(n.titulo ?? '').replace(/'/g, "\\'")}')" title="Eliminar">
            <i class="fas fa-trash"></i>
            </button>
        </div>
        </td>`;
    return tr;
}

// Actualizar contenido de una fila existente SIN recrearla
function patchRow(tr, n) {
    const newHash = noticiaHash(n);
    if (tr.dataset.hash === newHash) return;

    const firstTd = tr.children[1];
    const img = firstTd.querySelector('img.thumbnail-preview');
    if (n.miniatura) {
        const needed = `uploads/${n.miniatura}`;
        if (!img) {
            firstTd.innerHTML = `<img src="${needed}" class="thumbnail-preview" alt="${escapeHtml(n.titulo ?? '')}">`;
        } else if (!img.src.endsWith(`/${needed}`)) {
            img.src = needed;
            img.alt = escapeHtml(n.titulo ?? '');
        }
    } else if (img) {
        firstTd.innerHTML = `
        <div class="d-flex align-items-center justify-content-center" style="width:80px;height:80px;background:#f8f9fa;border-radius:4px;">
            <i class="fas fa-image fa-2x text-muted"></i>
        </div>`;
    }

    const tdTitulo = tr.children[2];
    const newTitulo = `<strong>${escapeHtml(n.titulo ?? '')}</strong>`;
    if (tdTitulo.innerHTML !== newTitulo) {
        tdTitulo.innerHTML = newTitulo;
    }

    const tdDesc = tr.children[3];
    const full = n.descripcion ?? '';
    const short = `${escapeHtml(full.substring(0,80))}${full.length > 80 ? '...' : ''}`;
    const title = escapeHtml(full);
    const newDesc = `<span title="${title}">${short}</span>`;
    if (tdDesc.innerHTML !== newDesc) {
        tdDesc.innerHTML = newDesc;
    }

    const tdFecha = tr.children[4];
    const newFecha = `<i class="fas fa-calendar text-muted"></i> ${formatDate(n.fecha)}`;
    if (tdFecha.innerHTML !== newFecha) {
        tdFecha.innerHTML = newFecha;
    }

    const tdFuente = tr.children[5];
    const newFuente = `<i class="fas fa-newspaper text-muted"></i> ${escapeHtml(n.fuente ?? '')}`;
    if (tdFuente.innerHTML !== newFuente) {
        tdFuente.innerHTML = newFuente;
    }

    tr.dataset.hash = newHash;
}

// Patch incremental (crear/actualizar/eliminar/reordenar)
function patchNoticiasIncremental(nextList) {
    const tbody = document.getElementById('noticiasContainer');

    if (!Array.isArray(nextList) || nextList.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
            <div class="alert alert-info mb-0">
                <i class="fas fa-info-circle"></i> No hay noticias registradas.
            </div>
            </td>
        </tr>`;
        return [];
    }
    tbody.querySelectorAll('tr[data-empty], tr:not([data-id])').forEach(tr => tr.remove());

    const nextIds = new Set(nextList.map(n => String(n.id)));
    const rowById = new Map([...tbody.querySelectorAll('tr[data-id]')].map(tr => [tr.dataset.id, tr]));

    // crear/actualizar y ordenar
    let anchor = null;
    for (const n of nextList) {
        const id = String(n.id);
        let tr = rowById.get(id);
        // crear solamente si no existe
        if (!tr) {
        tr = buildRow(n);
        // insertar en orden
        if (!anchor) {
            if (tbody.firstElementChild) {
                tbody.insertBefore(tr, tbody.firstElementChild);
            } else {
                tbody.appendChild(tr);
            }
        } else {
            if (anchor.nextElementSibling !== tr) {
                tbody.insertBefore(tr, anchor.nextElementSibling);
            }
        }
        } else {
            patchRow(tr, n);
            // mover posición
            if (!anchor) {
                if (tbody.firstElementChild !== tr) {
                    tbody.insertBefore(tr, tbody.firstElementChild);
                }
            } else if (anchor.nextElementSibling !== tr) {
                    tbody.insertBefore(tr, anchor.nextElementSibling);
            }
        }
        anchor = tr;
    }

    // eliminar
    for (const tr of tbody.querySelectorAll('tr[data-id]')) {
        if (!nextIds.has(tr.dataset.id)) {
            selectedIds.delete(tr.dataset.id);
            tr.remove();
            console.log("remove");
        }
    }
    updateBulkUI();

    return nextList;
}

function updateBulkUI() {
    // botón y contador
    const btn = document.getElementById('btnDeleteSelected');
    const badge = document.getElementById('bulkCount');
    const count = selectedIds.size;
    btn.disabled = count === 0;
    badge.textContent = String(count);
    badge.classList.toggle('d-none', count === 0);

    // checkbox maestro
    const all = [...document.querySelectorAll('#noticiasContainer tr[data-id]')];
    const allSelected = all.length > 0 && all.every(tr => selectedIds.has(tr.dataset.id));
    const master = document.getElementById('chkAll');
    master.checked = allSelected;
    master.indeterminate = !allSelected && count > 0;
}

// clicks en checkboxes de filas
document.addEventListener('change', (e) => {
    // Fila
    if (e.target.matches('.row-check')) {
        const id = e.target.closest('tr')?.dataset.id;
        if (!id) return;
        if (e.target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        updateBulkUI();
    }
    // Maestro
    if (e.target.id === 'chkAll') {
        const checked = e.target.checked;
        document.querySelectorAll('#noticiasContainer tr[data-id] .row-check').forEach(chk => {
            chk.checked = checked;
            const id = chk.closest('tr').dataset.id;
            if (checked) selectedIds.add(id); else selectedIds.delete(id);
        });
        updateBulkUI();
    }
});

// Confirmar selección borrado en lote
function confirmBulkDelete() {
    const n = selectedIds.size;
    if (n === 0) return;
    document.getElementById('confirmMessage').textContent =
        `¿Está seguro que desea eliminar ${n} noticia${n>1?'s':''} seleccionada${n>1?'s':''}?`;
    document.getElementById('confirmButton').onclick = deleteSelected;
    confirmModal.show();
}

async function deleteSelected() {
    const ids = [...selectedIds].map(x => Number(x));
    try {

        for (const id of ids) {
            const r = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
            if (!r.ok) {
                const t = await r.text();
                throw new Error(`Fallo al eliminar id ${id}: ${t.slice(0,150)}`);
            }
        }

        document.getElementById('confirmButton').blur();
        bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();

        ids.forEach(id => {
        const tr = document.querySelector(`#noticiasContainer tr[data-id="${id}"]`);
        if (tr) tr.remove();
        selectedIds.delete(String(id));
        });

        if (!document.querySelector('#noticiasContainer tr[data-id]')) {
        document.getElementById('noticiasContainer').innerHTML = `
            <tr data-empty="1">
            <td colspan="7" class="text-center">
                <div class="alert alert-info mb-0">
                <i class="fas fa-info-circle"></i> No hay noticias registradas.
                </div>
            </td>
            </tr>`;
        }
        updateBulkUI();
        showToast('Noticias eliminadas', 'success');

    } catch (err) {
        showError('Error al eliminar seleccionadas: ' + err.message);
    }
}

/**
 * Mostrar noticias en el DOM
 */
// function displayNoticias(noticias) {
//     const container = document.getElementById('noticiasContainer');
    
//     if (noticias.length === 0) {
//         container.innerHTML = `
//             <tr>
//                 <td colspan="6" class="text-center">
//                     <div class="alert alert-info mb-0">
//                         <i class="fas fa-info-circle"></i> No hay noticias registradas.
//                     </div>
//                 </td>
//             </tr>
//         `;
//         return;
//     }
    
//     const noticiasHTML = noticias.map(noticia => `
//         <tr>
//             <td class="text-center">
//                 ${noticia.miniatura ? `
//                     <img src="uploads/${noticia.miniatura}" class="thumbnail-preview" alt="${escapeHtml(noticia.titulo)}">
//                 ` : `
//                     <div class="d-flex align-items-center justify-content-center" style="width: 80px; height: 80px; background-color: #f8f9fa; border-radius: 4px;">
//                         <i class="fas fa-image fa-2x text-muted"></i>
//                     </div>
//                 `}
//             </td>
//             <td>
//                 <strong>${escapeHtml(noticia.titulo)}</strong>
//             </td>
//             <td class="description-cell">
//                 <span title="${escapeHtml(noticia.descripcion)}">
//                     ${escapeHtml(noticia.descripcion.substring(0, 80))}${noticia.descripcion.length > 80 ? '...' : ''}
//                 </span>
//             </td>
//             <td>
//                 <i class="fas fa-calendar text-muted"></i> ${formatDate(noticia.fecha)}
//             </td>
//             <td>
//                 <i class="fas fa-newspaper text-muted"></i> ${escapeHtml(noticia.fuente)}
//             </td>
//             <td class="actions-cell">
//                 <div class="btn-group btn-group-sm">
//                     <button class="btn btn-outline-primary" onclick="editNoticia(${noticia.id})" title="Editar">
//                         <i class="fas fa-edit"></i>
//                     </button>
//                     <button class="btn btn-outline-danger" onclick="confirmDelete(${noticia.id}, '${escapeHtml(noticia.titulo)}')" title="Eliminar">
//                         <i class="fas fa-trash"></i>
//                     </button>
//                 </div>
//             </td>
//         </tr>
//     `).join('');
    
//     container.innerHTML = noticiasHTML;
// }

/**
 * Abrir modal para nueva noticia
 */
function openModal() {
    currentEditId = null;
    document.getElementById('modalTitle').textContent = 'Nueva Noticia';
    document.getElementById('noticiaForm').reset();
    document.getElementById('noticiaId').value = '';
    document.getElementById('currentImage').style.display = 'none';
    clearMessages();
    
    // Establecer fecha actual
    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
    
    noticiaModal.show();
}

/**
 * Editar noticia existente
 */
async function editNoticia(id) {
    currentEditId = id;
    
    try {
        const response = await fetch(`${API_URL}?id=${id}`);
        const result = await response.json();
        
        if (result.success) {
            const noticia = result.data;
            
            document.getElementById('modalTitle').textContent = 'Editar Noticia';
            document.getElementById('noticiaId').value = noticia.id;
            document.getElementById('titulo').value = noticia.titulo;
            document.getElementById('descripcion').value = noticia.descripcion;
            document.getElementById('fecha').value = noticia.fecha;
            document.getElementById('fuente').value = noticia.fuente;
            
            // Mostrar imagen actual si existe
            if (noticia.miniatura) {
                document.getElementById('currentImagePreview').src = `uploads/${noticia.miniatura}`;
                document.getElementById('currentImage').style.display = 'block';
            } else {
                document.getElementById('currentImage').style.display = 'none';
            }
            
            clearMessages();
            noticiaModal.show();
        } else {
            showError('Error al cargar la noticia: ' + result.error);
        }
    } catch (error) {
        showError('Error de conexión: ' + error.message);
    }
}

/**
 * Guardar noticia (crear o actualizar)
 */
async function saveNoticia() {
    const form = document.getElementById('noticiaForm');
    
    // Mostrar spinner de carga
    showSaveLoading(true);
    clearMessages();
    
    try {
        if (currentEditId) {
            await updateNoticia(currentEditId, form);
        } else {
            await createNoticia(form);
        }
    } catch (error) {
        showErrorMessage('Error de conexión: ' + error.message);
    } finally {
        showSaveLoading(false);
    }
}

function validateMiniaturaInput() {
    const input = document.getElementById('miniatura');
    const f = input.files && input.files[0];
    if (!f) return { ok: true };

    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const mime = f.type;

    if (!ALLOWED_EXTS.includes(ext) || !ALLOWED_MIMES.includes(mime)) {
        return { ok: false, msg: 'Formato no permitido. Solo JPG, JPEG, PNG o GIF.' };
    }
    if (f.size > MAX_FILE_BYTES) {
        return { ok: false, msg: `El archivo supera el máximo de 5 MB (tamaño: ${(f.size/1024/1024).toFixed(2)} MB).` };
    }
    return { ok: true };
}

const miniaturaCreate = document.getElementById('miniatura');
if (miniaturaCreate) {
    miniaturaCreate.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'miniatura') {
            const v = validateMiniaturaInput();
            if (!v.ok) {
                showErrorMessage(v.msg);
                e.target.value = '';
            } else {
                clearMessages();
            }
        }
    });
}

/**
 * Crear nueva noticia con POST
 */
async function createNoticia(form) {
    const v = validateMiniaturaInput();
    if (!v.ok) {
        showErrorMessage(v.msg);
        return;
    }

    const reqErrs = validateFormRequired();
    if (reqErrs.length) {
        showErrorMessagePlus(reqErrs);
        return;
    }
    
    try {
        const formData = new FormData(form);
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            if (response.status === 413) {
                showErrorMessage('El archivo es demasiado grande. Máximo 5 MB.');
                return;
            }
            const text = await response.text();
            showErrorMessage(`Error de servidor: ${text}`);
            return;
        }
        
        const result = await response.json();
        
        handleSaveResponse(result);
    } catch (error) {
        showErrorMessage('Error de conexión: ' + error.message);
    } finally {
        showSaveLoading(false);
    }
}

function validateFormRequired(mode = "create") {
    const errs = [];
    const titulo = document.getElementById('titulo');
    const descripcion = document.getElementById('descripcion');
    const miniatura = document.getElementById('miniatura');
    const fecha = document.getElementById('fecha');
    const fuente = document.getElementById('fuente');

    // limpiar estado previo
    [titulo, descripcion, miniatura, fecha, fuente].forEach(el => el.classList.remove('is-invalid'));

    if (!titulo.value.trim()) { errs.push('El título es obligatorio'); titulo.classList.add('is-invalid'); }
    if (!descripcion.value.trim()) { errs.push('La descripción es obligatoria'); descripcion.classList.add('is-invalid'); }
    if (!fecha.value) { errs.push('La fecha es obligatoria'); fecha.classList.add('is-invalid'); }
    if (!fuente.value.trim()) { errs.push('La fuente es obligatoria'); fuente.classList.add('is-invalid'); }
    if (mode === "create") {
        const f = miniatura.files && miniatura.files[0];
        if (!f) { errs.push('La miniatura es obligatoria'); miniatura.classList.add('is-invalid'); }
    }

    return errs;
}

function clearFormValidation(form) {
  if (!form) return;
    // quitar clases de error
    form.querySelectorAll('.is-invalid, .is-valid').forEach(el => {
        el.classList.remove('is-invalid', 'is-valid');
    });
    // limpiar mensajes de error/éxito
    const err = document.getElementById('errorMessages');
    const ok  = document.getElementById('successMessage');
    if (err) { err.innerHTML = ''; err.style.display = 'none'; }
    if (ok)  { ok.innerHTML  = ''; ok.style.display  = 'none'; }
}

function renderErrors(err) {
    if (Array.isArray(err)) {
        return `<ul class="mb-0">${err.map(e => `<li>${escapeHtml(String(e))}</li>`).join('')}</ul>`;
    }
    return escapeHtml(String(err || 'Error desconocido'));
}

function showErrorMessagePlus(err) {
    const html = renderErrors(err);
    const div = document.getElementById('errorMessages');
    div.innerHTML = html;
    div.style.display = 'block';
}

async function readJsonOrText(res) {
    const text = await res.text();
    try { return { json: JSON.parse(text), raw: text }; }
    catch { return { json: null, raw: text }; }
}

/**
 * Actualizar noticia existente con PUT
 */
async function updateNoticia(id, form) {
    const fileInput = document.getElementById('miniatura');
    const hasNewFile = fileInput.files.length > 0;
    
    const reqErrs = validateFormRequired("edit");
    if (reqErrs.length) {
        showErrorMessagePlus(reqErrs);
        return;
    }
    
    if (hasNewFile) {
        // Si hay archivo nuevo, primero subirlo por separado
        const v = validateMiniaturaInput();
        if (!v.ok) {
            showErrorMessage(v.msg);
            return;
        }
        await updateNoticiaWithFile(id, form);
    } else {
        // Si no hay archivo, usar PUT puro con JSON
        await updateNoticiaJSON(id, form);
    }
}

/**
 * Actualizar noticia sin archivo (PUT + JSON)
 */
async function updateNoticiaJSON(id, form) {
    const formData = new FormData(form);
    
    // Convertir FormData a objeto JSON
    const data = {
        titulo: formData.get('titulo'),
        descripcion: formData.get('descripcion'),
        fecha: formData.get('fecha'),
        fuente: formData.get('fuente')
        // miniatura se mantiene como está en el servidor
    };
    
    const response = await fetch(`${API_URL}?id=${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    handleSaveResponse(result);
}

/**
 * Actualizar noticia con archivo nuevo (POST + FormData)
 */
async function updateNoticiaWithFile(id, form) {
    const formData = new FormData(form);
    
    const response = await fetch(`${API_URL}?id=${id}&_method=PUT`, {
        method: 'POST', // POST porque necesitamos enviar archivos
        body: formData
    });
    
    const result = await response.json();
    
    handleSaveResponse(result);
}

/**
 * Manejar respuesta del servidor
 */
function handleSaveResponse(result) {
    if (result.success) {
        showSuccessMessage(result.data.message || 'Operación realizada exitosamente');
        setTimeout(() => {
            noticiaModal.hide();
            loadNoticias();
        }, 1500);
    } else {
        if (Array.isArray(result.error)) {
            showErrorMessage(result.error.join('<br>'));
        } else {
            showErrorMessage(result.error);
        }
    }
}

/**
 * Confirmar eliminación
 */
function confirmDelete(id, titulo) {
    document.getElementById('confirmMessage').textContent = `¿Está seguro que desea eliminar la noticia "${titulo}"?`;
    
    document.getElementById('confirmButton').onclick = function() {
        deleteNoticia(id);
    };
    
    confirmModal.show();
}

/**
 * Eliminar noticia
 */
async function deleteNoticia(id) {
    try {
        const response = await fetch(`${API_URL}?id=${id}`, {
            method: 'DELETE'
        });
        
        const result = await readJsonSafe(response);
        
        if (result.success !== false) {
            const btn = document.getElementById('confirmButton');
            if (btn) btn.blur();

            const modalEl = document.getElementById('confirmModal');
            const bs = bootstrap.Modal.getInstance(modalEl);
            bs.hide();

            showToast('Noticia eliminada exitosamente', 'success');
            removeRowById(String(id));
        } else {
            showError('Error al eliminar: ' + result.error);
        }
    } catch (error) {
        showError('Error de conexión: ' + error.message);
    }
}

async function readJsonSafe(res) {
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,300) || '<sin cuerpo>'}`);
    if (!text) return {};
    try { return JSON.parse(text); }
    catch { return { success: true }; }
}

function removeRowById(id) {
    const tbody = document.getElementById('noticiasContainer');
    const tr = tbody.querySelector(`tr[data-id="${id}"]`);
    if (tr) tr.remove();

    if (!tbody.querySelector('tr[data-id]')) {
        tbody.innerHTML = `
        <tr data-empty="1">
            <td colspan="6" class="text-center">
            <div class="alert alert-info mb-0">
                <i class="fas fa-info-circle"></i> No hay noticias registradas.
            </div>
            </td>
        </tr>`;
    }
}

/**
 * Mostrar/ocultar spinner de carga principal
 */
function showLoading(show) {
    const loading = document.getElementById('loading');
    const table = document.getElementById('noticiasTable');
    
    if (show) {
        loading.style.display = 'block';
        table.style.display = 'none';
    } else {
        loading.style.display = 'none';
        table.style.display = 'table';
    }
}

/**
 * Mostrar/ocultar spinner de carga del botón guardar
 */
function showSaveLoading(show) {
    const buttonText = document.getElementById('saveButtonText');
    const spinner = document.getElementById('saveSpinner');
    const button = spinner.closest('button');
    
    if (show) {
        buttonText.textContent = 'Guardando...';
        spinner.classList.remove('d-none');
        button.disabled = true;
    } else {
        buttonText.textContent = 'Guardar';
        spinner.classList.add('d-none');
        button.disabled = false;
    }
}

/**
 * Mostrar mensaje de error en el modal
 */
function showErrorMessage(message) {
    const errorDiv = document.getElementById('errorMessages');
    errorDiv.innerHTML = message;
    errorDiv.style.display = 'block';
}

/**
 * Mostrar mensaje de éxito en el modal
 */
function showSuccessMessage(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.innerHTML = message;
    successDiv.style.display = 'block';
}

/**
 * Limpiar mensajes
 */
function clearMessages() {
    document.getElementById('errorMessages').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

/**
 * Mostrar error general
 */
function showError(message) {
    showToast(message, 'danger');
}

/**
 * Mostrar toast notification
 */
function showToast(message, type = 'info') {
    // Crear toast dinámicamente
    const toastContainer = getOrCreateToastContainer();
    
    const toastId = 'toast_' + Date.now();
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Eliminar el toast del DOM después de que se oculte
    toast.addEventListener('hidden.bs.toast', function () {
        toast.remove();
    });
}

/**
 * Crear o obtener contenedor de toasts
 */
function getOrCreateToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1060';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Formatear fecha
 */
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Escapar HTML para prevenir XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}