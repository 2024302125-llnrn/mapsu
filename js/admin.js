let currentAction = null;
let selectedBuildingId = null;

function setSelectedBuilding(building) {
    selectedBuildingId = building ? Number(building.id) : null;
}

function getBuildingById(id) {
    return window.buildings?.find(b => Number(b.id) === Number(id)) || null;
}

function getBuildingByName(name) {
    return window.buildings?.find(b => b.name === name) || null;
}

function getCurrentPopupBuilding() {
    const popupContent = map?._popup?.getContent?.() || '';
    return window.buildings?.find(b => popupContent.includes(b.name)) || null;
}

function getCurrentInputBuilding() {
    const names = [
        document.getElementById('searchBox')?.value?.trim(),
        document.getElementById('destSelect')?.value?.trim(),
        document.getElementById('startPoint')?.value?.trim()
    ];

    return names.map(getBuildingByName).find(b => b);
}

function resolveCurrentBuilding() {
    const building =
        getBuildingById(selectedBuildingId) ||
        getCurrentPopupBuilding() ||
        getCurrentInputBuilding();

    if (building) setSelectedBuilding(building);
    return building;
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

async function reloadMap(showLoader = true) {
    if (showLoader) showLoading();

    try {
        await loadBuildingsFromDB();
        setSelectedBuilding(null);
        hideInfoPanel();
        attachMarkerSelectionHandlers();
    } finally {
        if (showLoader) hideLoading();
    }
}

function attachMarkerSelectionHandlers() {
    if (!window.buildings || typeof markersByName === 'undefined') return;

    window.buildings.forEach(building => {
        const marker = markersByName.get(building.name)?.marker;

        if (!marker || marker._bound) return;

        marker.on('click', () => setSelectedBuilding(building));
        marker._bound = true;
    });
}

async function createBuilding(data) {
    const adminId = sessionStorage.getItem('adminId');

    try {
        showLoading();

        const res = await fetch('php/manage_buildings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create',
                adminid: parseInt(adminId),
                ...data
            })
        });

        const result = await res.json();

        if (result.success) {
            showToast('Building created!', 'success');
            await reloadMap();
        } else {
            showToast(result.error, 'error');
        }

    } catch (err) {
        console.error(err);
        showToast('Create failed', 'error');
    } finally {
        hideLoading();
    }
}

async function updateBuilding(data) {
    const adminId = sessionStorage.getItem('adminId');

    try {
        showLoading();

        const res = await fetch('php/manage_buildings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'update',
                adminid: parseInt(adminId),
                ...data
            })
        });

        const result = await res.json();

        if (result.success) {
            showToast('Updated successfully', 'success');
            await reloadMap();
        } else {
            showToast(result.error, 'error');
        }

    } catch (err) {
        console.error(err);
        showToast('Update failed', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteBuilding(id) {
    const adminId = sessionStorage.getItem('adminId');

    try {
        showLoading();

        const res = await fetch('php/manage_buildings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                adminid: parseInt(adminId),
                id
            })
        });

        const result = await res.json();

        if (result.success) {
            showToast('Deleted successfully', 'success');
            await reloadMap();
        } else {
            showToast(result.error, 'error');
        }

    } catch (err) {
        console.error(err);
        showToast('Delete failed', 'error');
    } finally {
        hideLoading();
    }
}

function showCreateForm() {
    currentAction = 'create';
    document.getElementById('modalTitle').textContent = 'Add New Building';
    document.getElementById('buildingForm').reset();
    document.getElementById('buildingId').value = '';
    document.getElementById('buildingModal').style.display = 'flex';
}

function showUpdateForm() {
    const building = resolveCurrentBuilding();

    if (!building) {
        showToast('Select a building first', 'error');
        return;
    }

    currentAction = 'update';

    document.getElementById('modalTitle').textContent = 'Update Building';
    document.getElementById('buildingId').value = building.id;
    document.getElementById('buildingName').value = building.name;
    document.getElementById('buildingX').value = building.coordinates[0];
    document.getElementById('buildingY').value = building.coordinates[1];
    document.getElementById('buildingInfo').value = building.info;

    document.getElementById('buildingModal').style.display = 'flex';
}

function showDeleteConfirm() {
    const building = resolveCurrentBuilding();

    if (!building) {
        showToast('Select a building first', 'error');
        return;
    }

    const modal = document.getElementById('confirmModal');
    const msg = document.getElementById('confirmMessage');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    msg.textContent = `Are you sure you want to delete "${building.name}"? This action cannot be undone.`;
    modal.style.display = 'flex';

    confirmBtn.onclick = async () => {
        closeConfirmModal();
        await deleteBuilding(building.id);
    };
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

function closeModal() {
    document.getElementById('buildingModal').style.display = 'none';
    currentAction = null;
}

async function handleBuildingSubmit(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('buildingName').value,
        x: parseFloat(document.getElementById('buildingX').value),
        y: parseFloat(document.getElementById('buildingY').value),
        info: document.getElementById('buildingInfo').value
    };

    if (currentAction === 'create') {
        await createBuilding(data);
    } else if (currentAction === 'update') {
        data.id = parseInt(document.getElementById('buildingId').value);
        await updateBuilding(data);
    }

    closeModal();
}

function logout() {
    sessionStorage.clear();
    window.location.href = 'login.html';
}

if (typeof renderMarkers !== 'undefined') {
    const original = renderMarkers;
    window.renderMarkers = function(name = "") {
        original(name);
        if (name) {
            const b = getBuildingByName(name);
            if (b) setSelectedBuilding(b);
        }
        attachMarkerSelectionHandlers();
    };
}

if (typeof focusBuilding !== 'undefined') {
    const original = focusBuilding;
    window.focusBuilding = function(name) {
        const b = getBuildingByName(name);
        if (b) setSelectedBuilding(b);
        original(name);
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    const adminLoggedIn = sessionStorage.getItem('adminLoggedIn');
    const adminId = sessionStorage.getItem('adminId');

    if (!adminLoggedIn || adminLoggedIn !== 'true' || !adminId) {
        showToast('Please login first', 'error');
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('buildingForm')
        ?.addEventListener('submit', handleBuildingSubmit);

    await reloadMap(false);
});