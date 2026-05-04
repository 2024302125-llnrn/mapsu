let nodes = {};
let buildingConnections = {};
let nodeConnections = {};

let currentStreetImage = null;
let translateX = 0;

async function loadGraphDataFromDB() {
    try {
        const response = await fetch('api/get_graph_data.php');
        const data = await response.json();

        if (data.success) {
            nodes = data.nodes;

            for (let key in data.connections) {
                if (key.startsWith("N")) {
                    nodeConnections[key] = data.connections[key];
                } else {
                    buildingConnections[key] = data.connections[key];
                }
            }

            return true;
        }

        return false;
    } catch (error) {
        console.error("DB Load Error:", error);
        return false;
    }
}

function loadGraphDataFromJS() {
    if (
        typeof window.nodesData !== "undefined" &&
        typeof window.connectionsData !== "undefined"
    ) {
        nodes = window.nodesData;

        for (let key in window.connectionsData) {
            if (key.startsWith("N")) {
                nodeConnections[key] = window.connectionsData[key];
            } else {
                buildingConnections[key] = window.connectionsData[key];
            }
        }

        return true;
    }

    return false;
}

async function initGraphData() {
    const dbLoaded = await loadGraphDataFromDB();

    if (!dbLoaded) {
        loadGraphDataFromJS();
    }

    return (
        Object.keys(nodes).length > 0 &&
        Object.keys(nodeConnections).length > 0 &&
        Object.keys(buildingConnections).length > 0
    );
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.className = "toast";
    }, 3000);
}

window.showCustomAlert = function (title, message) {
    if (document.getElementById("toast")) {
        showToast(`${title}: ${message}`, "error");
    } else {
        alert(message);
    }
};

function openImageDisplayer(imageUrl) {
    const displayer = document.getElementById("imageDisplayer");
    const fullImage = document.getElementById("fullSizeImage");

    if (!displayer || !fullImage) return;

    fullImage.src = imageUrl;
    displayer.style.display = "block";
}

function closeImageDisplayer() {
    const displayer = document.getElementById("imageDisplayer");
    if (displayer) {
        displayer.style.display = "none";
    }
}

function distance(coord1, coord2) {
    let dx = coord1[0] - coord2[0];
    let dy = coord1[1] - coord2[1];
    return Math.sqrt(dx * dx + dy * dy);
}

function heuristic(nodeA, nodeB) {
    return distance(nodes[nodeA], nodes[nodeB]);
}

function getNearestNode(coord) {
    let minDist = Infinity;
    let nearestNode = null;

    for (let key in nodes) {
        let dist = distance(coord, nodes[key]);

        if (dist < minDist) {
            minDist = dist;
            nearestNode = key;
        }
    }

    return nearestNode;
}

function reconstructPath(cameFrom, current) {
    let totalPath = [current];

    while (cameFrom[current]) {
        current = cameFrom[current];
        totalPath.unshift(current);
    }

    return totalPath;
}

function aStar(startNode, goalNode) {
    let openSet = [startNode];
    let cameFrom = {};
    let gScore = {};
    let fScore = {};

    for (let node in nodes) {
        gScore[node] = Infinity;
        fScore[node] = Infinity;
    }

    gScore[startNode] = 0;
    fScore[startNode] = heuristic(startNode, goalNode);

    while (openSet.length > 0) {
        let current = openSet.reduce((a, b) =>
            fScore[a] < fScore[b] ? a : b
        );

        if (current === goalNode) {
            return reconstructPath(cameFrom, current);
        }

        openSet = openSet.filter((n) => n !== current);

        let neighbors = nodeConnections[current] || [];

        for (let neighbor of neighbors) {
            if (!nodes[neighbor]) continue;

            let tentativeGScore =
                gScore[current] +
                distance(nodes[current], nodes[neighbor]);

            if (tentativeGScore < gScore[neighbor]) {
                cameFrom[neighbor] = current;
                gScore[neighbor] = tentativeGScore;
                fScore[neighbor] =
                    gScore[neighbor] +
                    heuristic(neighbor, goalNode);

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    return null;
}

function findMappedNode(buildingName) {
    const normalize = (text) =>
        (text || "").trim().toLowerCase();

    const target = normalize(buildingName);

    for (let key in buildingConnections) {
        if (normalize(key) === target) {
            const linkedNodes = buildingConnections[key];

            if (
                Array.isArray(linkedNodes) &&
                linkedNodes.length > 0 &&
                nodes[linkedNodes[0]]
            ) {
                return linkedNodes[0];
            }
        }
    }

    return null;
}

function findRoute(startCoord, endCoord, startName, endName) {
    let startNode = findMappedNode(startName);
    let endNode = findMappedNode(endName);

    if (!startNode) {
        startNode = getNearestNode(startCoord);
    }

    if (!endNode) {
        endNode = getNearestNode(endCoord);
    }

    if (!startNode || !endNode) {
        return null;
    }

    if (startNode === endNode) {
        return [
            startCoord,
            nodes[startNode],
            endCoord
        ];
    }

    const nodePath = aStar(startNode, endNode);

    console.log("Node Path Found:", nodePath);

    if (!nodePath || nodePath.length === 0) {
        return null;
    }

    let routeCoords = [];

    routeCoords.push(startCoord);

    nodePath.forEach((nodeId) => {
        if (nodes[nodeId]) {
            routeCoords.push(nodes[nodeId]);
        }
    });

    routeCoords.push(endCoord);

    return routeCoords;
}

function showRoute() {
    const start = document.getElementById("startPoint").value;
    const dest = document.getElementById("destSelect").value;

    if (!start || !dest) {
        showCustomAlert(
            "Missing Selection",
            "Please select start and destination."
        );
        return;
    }

    const startBuilding = window.buildings.find(
        (b) => b.name === start
    );

    const destBuilding = window.buildings.find(
        (b) => b.name === dest
    );

    if (!startBuilding || !destBuilding) {
        showCustomAlert("Error", "Building not found.");
        return;
    }

    const startCoords =
        startBuilding.coords || startBuilding.coordinates;

    const destCoords =
        destBuilding.coords || destBuilding.coordinates;

    const route = findRoute(
        startCoords,
        destCoords,
        start,
        dest
    );

    if (!route) {
        showCustomAlert(
            "Route Error",
            "No route found between these locations."
        );
        return;
    }

    if (routeLine) {
        map.removeLayer(routeLine);
    }

    const fixedRoute = route;

    routeLine = L.polyline(fixedRoute, {
        color: "#f5ff38",
        weight: 5,
        opacity: 0.9,
        dashArray: "10, 5",
        lineJoin: "miter",
        lineCap: "butt"
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), {
        padding: [50, 50]
    });

    if (typeof showInfoPanel === "function") {
        if (!isMobile()) {
            showInfoPanel(destBuilding);
        } else {
            hideInfoPanel();
        }
    }

    if (window.startMarker) {
        map.removeLayer(window.startMarker);
    }

    if (window.endMarker) {
        map.removeLayer(window.endMarker);
    }

    window.startMarker = L.marker(startCoords)
        .addTo(map)
        .bindTooltip("YOU ARE HERE!", {
            permanent: true,
            direction: "top",
            offset: [0, -10],
            className: "route-tooltip"
        });

    window.endMarker = L.marker(destCoords)
        .addTo(map)
        .bindTooltip("YOUR DESTINATION IS HERE!", {
            permanent: true,
            direction: "top",
            offset: [0, -10],
            className: "route-tooltip"
        });
}

function openStreetView() {
    const building = window.currentBuilding;

    if (!building || !building.street_view) {
        showToast(
            building
                ? `No street view available for ${building.name}`
                : "No building selected",
            "error"
        );
        return;
    }

    const modal = document.getElementById("streetViewModal");
    const img = document.getElementById("streetViewImage");

    if (!modal || !img) return;

    let rawPath = building.street_view;
    
    let cleanPath = typeof rawPath === 'string' 
        ? rawPath.replace(/^(\.\.\/|\/)+/, '') 
        : '';
    
    const finalUrl = '/mapsu/' + cleanPath;
    
    img.src = finalUrl;
    console.log("Opening Street View from:", finalUrl);
  
    modal.style.display = "flex";

    currentStreetImage = img;
    translateX = 0;

    img.onload = function () {
        const container = document.getElementById("streetViewContainer");
        if (container && img.offsetWidth > container.offsetWidth) {
            translateX = -(img.offsetWidth - container.offsetWidth) / 2;
            img.style.transform = `translateX(${translateX}px)`;
        }
    };
}

function closeStreetView() {
    const modal = document.getElementById("streetViewModal");

    if (modal) {
        modal.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const success = await initGraphData();

    if (success) {
        console.log("Graph data loaded successfully");
    } else {
        console.error(
            "Failed to load graph data from DB and JS"
        );
    }

    const container = document.getElementById(
        "streetViewContainer"
    );

    if (container) {
        container.addEventListener("mousemove", (e) => {
            if (!currentStreetImage) return;

            const rect = container.getBoundingClientRect();
            const maxMove =
                currentStreetImage.offsetWidth - rect.width;

            if (maxMove > 0) {
                const moveX =
                    -maxMove *
                    ((e.clientX - rect.left) / rect.width);

                currentStreetImage.style.transform =
                    `translateX(${moveX}px)`;
            }
        });
    }

    document.addEventListener("click", (e) => {
        const displayer =
            document.getElementById("imageDisplayer");

        if (
            displayer &&
            displayer.style.display === "block" &&
            e.target === displayer
        ) {
            closeImageDisplayer();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeImageDisplayer();
            closeStreetView();
        }
    });
});

window.openStreetView = openStreetView;