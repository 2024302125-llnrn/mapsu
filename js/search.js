function handleSearch(val) {
    const dropdown = document.getElementById('searchDropdown');
    
    dropdown.innerHTML = "";
    if (val.length < 1) { 
        dropdown.style.display = "none"; 
        return; 
    }

    const dataSource = window.buildings || [];

    let matches = dataSource.filter(b => 
        (b.name && b.name.toLowerCase().includes(val.toLowerCase())) || 
        (b.description && b.description.toLowerCase().includes(val.toLowerCase())) ||
        (b.info && b.info.toLowerCase().includes(val.toLowerCase()))
    );

    if (matches.length > 0) {
        dropdown.style.display = "block";

        matches.forEach(m => {
            let div = document.createElement('div');
            div.className = "search-item";
            
            const preview = m.info 
                ? (m.info.length > 50 ? m.info.substring(0, 50) + "..." : m.info)
                : "";

            div.innerHTML = `
                <b>${m.name}</b>
                <small class="search-info">${preview}</small>
            `;
            
            div.onclick = () => {
                document.getElementById('searchBox').value = m.name;
                dropdown.style.display = "none";

                if (!isMobile() && typeof showInfoPanel === 'function') {
                    showInfoPanel(m);
                }

                if (typeof focusBuilding === 'function') {
                    focusBuilding(m.name);
                }
            };

            dropdown.appendChild(div);
        });
    } else {
        dropdown.style.display = "none";
    }
}

function toggleMenu() {
    const menu = document.getElementById("menuDropdown");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

window.onclick = function(e) {
    if (!e.target.matches('.menu-btn')) {
        const menu = document.getElementById("menuDropdown");
        if (menu) menu.style.display = "none";
    }

    const dropdown = document.getElementById('searchDropdown');
    const searchBox = document.getElementById('searchBox');

    if (dropdown && 
        !dropdown.contains(e.target) && 
        e.target !== searchBox) {
        dropdown.style.display = "none";
    }
};

function setAsStart() {
    const searchBox = document.getElementById('searchBox');
    const startSelect = document.getElementById('startPoint');

    if (!searchBox.value) {
        showToast("Select a building first", "error");
        return;
    }

    startSelect.value = searchBox.value;

    const building = window.buildings.find(b => b.name === searchBox.value);
    if (building && typeof showInfoPanel === 'function') {
        if (!isMobile()) {
            showInfoPanel(building);
        } else {
            hideInfoPanel();
        }
    }

    showToast("Starting point selected");
}

function setAsDest() {
    const searchBox = document.getElementById('searchBox');
    const destSelect = document.getElementById('destSelect');

    if (!searchBox.value) {
        showToast("Select a building first", "error");
        return;
    }

    destSelect.value = searchBox.value;

    const building = window.buildings.find(b => b.name === searchBox.value);
    if (building && typeof showInfoPanel === 'function') {
        if (!isMobile()) {
            showInfoPanel(building);
        } else {
            hideInfoPanel(); //
        }
    }

    showToast("Destination selected");
}