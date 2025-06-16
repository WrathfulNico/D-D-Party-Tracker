// Array para almacenar los datos de los jugadores (máximo 4 jugadores)
const playersData = [{}, {}, {}, {}];

// Variables para manejar el estado global de la aplicación
let currentPlayerIndex = 0;  // Índice del jugador actualmente activo
let currentItemIndex = -1;   // Índice del objeto seleccionado

// Lista de estados alterados comunes en D&D 5e
const conditionOptions = [
    "Acechado", "Agarrado", "Agotado", "Asustado", "Aturdido", 
    "Cegado", "Enfermo", "Ensordecido", "Hechizado", "Inconsciente", 
    "Invisible", "Incapacitado", "Paralizado", "Petrificado", "Propenso", 
    "Restringido", "Venenado", "Concentración", "Maldito", "Poseído"
];

// Referencias a elementos clave del DOM
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const fileInputs = document.querySelectorAll('.player-file');
const fileInfos = document.querySelectorAll('.file-info');

// Configurar event listeners para las pestañas de jugadores
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remover clase activa de todas las pestañas y contenidos
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Añadir clase activa a la pestaña y contenido seleccionados
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(`${tabId}-content`).classList.add('active');
    });
});

// Configurar event listeners para los inputs de archivo
fileInputs.forEach(input => {
    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const playerIndex = parseInt(this.getAttribute('data-player')) - 1;
        const fileInfo = document.getElementById(`fileInfo${playerIndex+1}`);
        
        fileInfo.textContent = `Archivo cargado: ${file.name}`;
        fileInfo.style.color = '#4caf50';
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Parsear el contenido YAML a objeto JavaScript
                const data = jsyaml.load(e.target.result);
                playersData[playerIndex] = data;
                
                // Normalizar el formato de estados para compatibilidad
                if (data.estados) {
                    data.estados = data.estados.map(est => {
                        if (typeof est === 'string') {
                            return { estado: est };
                        }
                        return est;
                    });
                } else {
                    data.estados = [];
                }
                
                // Inicializar atributos si no existen
                if (!data.atributos) {
                    data.atributos = {
                        fuerza: 10,
                        destreza: 10,
                        constitucion: 10,
                        inteligencia: 10,
                        sabiduria: 10,
                        carisma: 10
                    };
                }
                
                // Inicializar experiencia si no existe
                if (!data.experiencia) {
                    data.experiencia = 0;
                }
                
                // Actualizar el nombre de la pestaña si está disponible
                if (data.nombre) {
                    document.querySelector(`.tab[data-tab="player${playerIndex+1}"] span`).textContent = data.nombre;
                }
                
                renderPlayer(playerIndex);
            } catch (error) {
                console.error('Error parsing YAML:', error);
                fileInfo.textContent = `Error en el archivo: ${error.message}`;
                fileInfo.style.color = '#d32f2f';
            }
        };
        
        reader.readAsText(file);
    });
});

// Función principal para renderizar los datos de un jugador
function renderPlayer(playerIndex) {
    const playerData = playersData[playerIndex];
    const playerContent = document.getElementById(`player${playerIndex+1}-data`);
    
    // Mostrar mensaje si no hay datos disponibles
    if (!playerData || Object.keys(playerData).length === 0) {
        playerContent.innerHTML = `
            <div class="no-data">
                <h3>No hay datos disponibles</h3>
                <p>Carga un archivo YML para mostrar la información del jugador</p>
            </div>
        `;
        return;
    }
    
    // Calcular porcentaje de salud y color de la barra
    const healthPercentage = (playerData.salud.actual / playerData.salud.máxima) * 100;
    const healthColor = healthPercentage > 70 ? '#4caf50' : 
                        healthPercentage > 30 ? '#ff9800' : '#d32f2f';
    
    // Generar HTML para los espacios de conjuros
    let spellSlotsHTML = '';
    if (playerData.espacios_conjuros) {
        for (const [level, slots] of Object.entries(playerData.espacios_conjuros)) {
            const levelNum = level.split('_')[1];
            spellSlotsHTML += `
                <div class="spell-level">
                    <div class="spell-level-header">
                        <div class="spell-level-title">Nivel ${levelNum}</div>
                        <div class="spell-controls">
                            <button class="control-btn minus small-btn" onclick="adjustSpellSlot(${playerIndex}, '${level}', -1)">-</button>
                            <span class="spell-value" id="spell-${playerIndex}-${level}">${slots}</span>
                            <button class="control-btn plus small-btn" onclick="adjustSpellSlot(${playerIndex}, '${level}', 1)">+</button>
                        </div>
                    </div>
                    <div class="spell-visual">
                        ${generateSpellCircles(slots)}
                    </div>
                </div>
            `;
        }
    }
    
    // Generar HTML para los consumibles
    let consumablesHTML = '';
    if (playerData.inventario && playerData.inventario.consumibles && playerData.inventario.consumibles.length > 0) {
        playerData.inventario.consumibles.forEach((item, itemIndex) => {
            consumablesHTML += `
                <div class="inventory-item consumable-item">
                    <div class="consumable-header">
                        <div class="consumable-name">${item.nombre}</div>
                        <div class="consumable-quantity">
                            <button class="control-btn minus small-btn" onclick="adjustConsumable(${playerIndex}, ${itemIndex}, -1)">-</button>
                            <span class="consumable-value" id="consumable-${playerIndex}-${itemIndex}">${item.cantidad}</span>
                            <button class="control-btn plus small-btn" onclick="adjustConsumable(${playerIndex}, ${itemIndex}, 1)">+</button>
                        </div>
                    </div>
                    <div class="item-controls">
                        <button class="use-consumable-btn" onclick="autoEquipItem(${playerIndex}, 'consumible', ${itemIndex})">
                            <i class="fas fa-flask"></i> Usar
                        </button>
                        <button class="delete-btn" onclick="deleteItem(${playerIndex}, 'consumible', ${itemIndex})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    // Generar HTML para los objetos del inventario
    let itemsHTML = '';
    if (playerData.inventario && playerData.inventario.objetos && playerData.inventario.objetos.length > 0) {
        playerData.inventario.objetos.forEach((item, itemIndex) => {
            let details = '';
            let properties = '';
            
            // Agregar detalles específicos según el tipo de objeto
            if (item.tipo === "arma") {
                details = `<p><strong>Daño:</strong> ${item.daño}</p>`;
            } else if (item.tipo === "armadura") {
                details = `<p><strong>CA:</strong> ${item.clase_armadura}</p>`;
            } else if (item.tipo === "escudo") {
                details = `<p><strong>Bonus CA:</strong> +${item.bonus_ca}</p>`;
            }
            
            // Agregar propiedades si están disponibles
            if (item.propiedades && item.propiedades.length > 0) {
                properties = `<p><strong>Propiedades:</strong> ${item.propiedades.join(', ')}</p>`;
            }
            
            itemsHTML += `
                <div class="inventory-item">
                    <h4>${item.nombre}</h4>
                    <p><strong>Tipo:</strong> ${item.tipo}</p>
                    ${details}
                    ${properties}
                    <div class="item-controls">
                        <button class="equip-btn" onclick="autoEquipItem(${playerIndex}, 'objeto', ${itemIndex})">
                            <i class="fas fa-shield-alt"></i> Equipar
                        </button>
                        <button class="delete-btn" onclick="deleteItem(${playerIndex}, 'objeto', ${itemIndex})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    // Generar HTML para los objetos equipados
    let equippedHTML = '';
    if (playerData.equipado) {
        for (const [slot, itemName] of Object.entries(playerData.equipado)) {
            equippedHTML += `
                <div class="equipped-item">
                    <h4>${slot.replace('_', ' ').toUpperCase()}</h4>
                    <p>${itemName}</p>
                </div>
            `;
        }
    }
    
    // Generar HTML para los estados alterados
    let conditionsHTML = '';
    if (playerData.estados && playerData.estados.length > 0) {
        playerData.estados.forEach((condicion, index) => {
            const estado = condicion.estado || condicion;
            conditionsHTML += `
                <div class="condition">
                    <span>${estado}</span>
                    <button class="condition-btn" onclick="removeCondition(${playerIndex}, ${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
    }
    
    // Generar HTML para los atributos
    let attributesHTML = '';
    if (playerData.atributos) {
        const attributes = [
            { name: 'Fuerza', key: 'fuerza' },
            { name: 'Destreza', key: 'destreza' },
            { name: 'Constitución', key: 'constitucion' },
            { name: 'Inteligencia', key: 'inteligencia' },
            { name: 'Sabiduría', key: 'sabiduria' },
            { name: 'Carisma', key: 'carisma' }
        ];
        
        attributes.forEach(attr => {
            attributesHTML += `
                <div class="attribute-card">
                    <div class="attribute-name">${attr.name}</div>
                    <div class="attribute-value" id="attr-${playerIndex}-${attr.key}">
                        ${playerData.atributos[attr.key]}
                    </div>
                    <div class="attribute-controls">
                        <button class="control-btn small-btn" onclick="adjustAttribute(${playerIndex}, '${attr.key}', -1)">-</button>
                        <button class="control-btn small-btn" onclick="adjustAttribute(${playerIndex}, '${attr.key}', 1)">+</button>
                    </div>
                </div>
            `;
        });
    }
    
    // Construir el HTML completo para la sección del jugador
    playerContent.innerHTML = `
        <!-- Sección de información del personaje -->
        <div class="character-section">
            <div class="section-title">Personaje</div>
            <div class="character-name">${playerData.nombre}</div>
            <div class="character-info">
                <div class="class-level">${playerData.clase || 'Sin clase'} - Nivel ${playerData.nivel || '1'}</div>
                <div class="level-controls">
                    <button class="control-btn level-down small-btn" onclick="adjustLevel(${playerIndex}, -1)">-</button>
                    <button class="control-btn level-up small-btn" onclick="adjustLevel(${playerIndex}, 1)">+</button>
                </div>
            </div>
            
            <!-- Sección de estados alterados -->
            <div class="conditions-section">
                ${conditionsHTML}
                <button class="add-condition-btn" onclick="openConditionModal(${playerIndex})">
                    <i class="fas fa-plus"></i> Agregar Estado
                </button>
            </div>
            
            <!-- Sección de salud -->
            <div class="health-section">
                <div class="health-bar">
                    <div class="health-fill" style="width: ${healthPercentage}%; background-color: ${healthColor};"></div>
                    <div class="health-text">${playerData.salud.actual} / ${playerData.salud.máxima}</div>
                </div>
                
                <div class="health-controls">
                    <button class="control-btn minus" onclick="adjustHealth(${playerIndex}, -1)">-</button>
                    <button class="control-btn plus" onclick="adjustHealth(${playerIndex}, 1)">+</button>
                </div>
                
                <!-- Sección de experiencia -->
                <div class="experience-section">
                    <div class="experience-title">
                        Experiencia 
                        <button class="edit-xp-btn" onclick="openXPModal(${playerIndex})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                    <div class="experience-value" id="xp-${playerIndex}">${playerData.experiencia || 0}</div>
                </div>
                
                <!-- Sección de atributos -->
                <div class="attributes-section">
                    <div class="section-title">Atributos</div>
                    <div class="attributes-grid">
                        ${attributesHTML}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Sección de equipamiento y conjuros -->
        <div class="player-layout">
            <div class="equipment-column">
                <div class="equipment-section">
                    <div class="section-title">Equipamiento</div>
                    <div class="equipped-items">
                        ${equippedHTML || '<p>No hay objetos equipados</p>'}
                    </div>
                </div>
                
                <div class="spell-section">
                    <div class="section-title">Espacios de Conjuros</div>
                    ${spellSlotsHTML || '<p>No tiene espacios de conjuros</p>'}
                </div>
            </div>
        </div>
        
        <!-- Sección de inventario -->
        <div class="inventory-row">
            <!-- Subsección de consumibles -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Consumibles</h3>
                    <button class="add-item-btn" onclick="openModal('consumableModal', ${playerIndex})">
                        <i class="fas fa-plus"></i> Nuevo
                    </button>
                </div>
                <div class="inventory-grid">
                    ${consumablesHTML || '<p>No hay consumibles</p>'}
                </div>
            </div>
            
            <!-- Subsección de objetos -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Inventario</h3>
                    <button class="add-item-btn" onclick="openModal('itemModal', ${playerIndex})">
                        <i class="fas fa-plus"></i> Nuevo
                    </button>
                </div>
                <div class="inventory-grid">
                    ${itemsHTML || '<p>No hay objetos</p>'}
                </div>
            </div>
        </div>
    `;
}

// Función para generar círculos visuales para los espacios de conjuros
function generateSpellCircles(count) {
    let circles = '';
    for (let i = 0; i < count; i++) {
        circles += '<div class="spell-circle"></div>';
    }
    return `<div class="spell-circles">${circles}</div>`;
}

// Función para ajustar la salud del personaje
function adjustHealth(playerIndex, amount) {
    const playerData = playersData[playerIndex];
    if (!playerData || !playerData.salud) return;
    
    // Calcular nuevo valor de salud respetando los límites
    let newHealth = playerData.salud.actual + amount;
    newHealth = Math.max(0, Math.min(newHealth, playerData.salud.máxima));
    playerData.salud.actual = newHealth;
    
    // Actualizar la barra de salud en la UI
    const healthPercentage = (newHealth / playerData.salud.máxima) * 100;
    const healthColor = healthPercentage > 70 ? '#4caf50' : 
                        healthPercentage > 30 ? '#ff9800' : '#d32f2f';
    
    const healthFill = document.querySelector(`#player${playerIndex+1}-data .health-fill`);
    const healthText = document.querySelector(`#player${playerIndex+1}-data .health-text`);
    
    if (healthFill) healthFill.style.width = `${healthPercentage}%`;
    if (healthFill) healthFill.style.backgroundColor = healthColor;
    if (healthText) healthText.textContent = `${newHealth} / ${playerData.salud.máxima}`;
}

// Función para ajustar el nivel del personaje
function adjustLevel(playerIndex, amount) {
    const playerData = playersData[playerIndex];
    if (!playerData) return;
    
    // Inicializar nivel si no existe
    if (!playerData.nivel) playerData.nivel = 1;
    
    // Calcular nuevo nivel (mínimo 1)
    let newLevel = parseInt(playerData.nivel) + amount;
    newLevel = Math.max(1, newLevel);
    
    playerData.nivel = newLevel;
    
    // Actualizar la UI
    const levelElement = document.querySelector(`#player${playerIndex+1}-data .class-level`);
    if (levelElement) {
        levelElement.textContent = `${playerData.clase || 'Sin clase'} - Nivel ${newLevel}`;
    }
}

// Función para ajustar los espacios de conjuros
function adjustSpellSlot(playerIndex, level, amount) {
    const playerData = playersData[playerIndex];
    if (!playerData || !playerData.espacios_conjuros || !(level in playerData.espacios_conjuros)) return;
    
    // Calcular nuevo valor (no puede ser negativo)
    let newValue = playerData.espacios_conjuros[level] + amount;
    newValue = Math.max(0, newValue);
    playerData.espacios_conjuros[level] = newValue;
    
    // Actualizar el valor en pantalla
    document.getElementById(`spell-${playerIndex}-${level}`).textContent = newValue;
    
    // Actualizar la representación visual
    const spellVisual = document.querySelector(`#player${playerIndex+1}-data .spell-level:has(#spell-${playerIndex}-${level}) .spell-visual`);
    if (spellVisual) {
        spellVisual.innerHTML = generateSpellCircles(newValue);
    }
}

// Función para ajustar la cantidad de consumibles
function adjustConsumable(playerIndex, itemIndex, amount) {
    const playerData = playersData[playerIndex];
    if (!playerData || !playerData.inventario || !playerData.inventario.consumibles) return;
    
    const consumable = playerData.inventario.consumibles[itemIndex];
    let newValue = consumable.cantidad + amount;
    if (newValue < 0) newValue = 0;
    consumable.cantidad = newValue;
    
    // Actualizar el contador en la UI
    const consumableElement = document.getElementById(`consumable-${playerIndex}-${itemIndex}`);
    if (consumableElement) {
        consumableElement.textContent = newValue;
    }
}

// Función para abrir el modal de experiencia
function openXPModal(playerIndex) {
    currentPlayerIndex = playerIndex;
    const playerData = playersData[playerIndex];
    
    // Cargar el valor actual de experiencia
    document.getElementById('xpValue').value = playerData.experiencia || 0;
    document.getElementById('xpModal').style.display = 'flex';
}

// Función para guardar la experiencia
function saveXP() {
    const playerData = playersData[currentPlayerIndex];
    const xpValue = parseInt(document.getElementById('xpValue').value) || 0;
    
    // Validar que no sea negativa
    if (xpValue < 0) {
        alert('La experiencia no puede ser negativa');
        return;
    }
    
    playerData.experiencia = xpValue;
    
    // Actualizar la UI
    const xpElement = document.getElementById(`xp-${currentPlayerIndex}`);
    if (xpElement) {
        xpElement.textContent = xpValue;
    }
    
    closeModal('xpModal');
}

// Función para ajustar los atributos
function adjustAttribute(playerIndex, attribute, amount) {
    const playerData = playersData[playerIndex];
    if (!playerData || !playerData.atributos) return;
    
    // Asegurar que el atributo existe
    if (playerData.atributos[attribute] === undefined) {
        playerData.atributos[attribute] = 10;
    }
    
    // Calcular nuevo valor (mínimo 1)
    let newValue = parseInt(playerData.atributos[attribute]) + amount;
    newValue = Math.max(1, newValue);
    
    playerData.atributos[attribute] = newValue;
    
    // Actualizar la UI
    const attrElement = document.getElementById(`attr-${playerIndex}-${attribute}`);
    if (attrElement) {
        attrElement.textContent = newValue;
    }
}

// Función para guardar los datos del jugador
function savePlayerData(playerIndex) {
    const playerData = playersData[playerIndex];
    if (!playerData || Object.keys(playerData).length === 0) {
        alert('No hay datos para guardar');
        return;
    }
    
    try {
        // Convertir datos a formato YAML
        const yamlData = jsyaml.dump(playerData);
        
        // Crear un blob con los datos
        const blob = new Blob([yamlData], { type: 'application/yaml' });
        
        // Crear un enlace de descarga
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dnd_player_${playerIndex+1}_${new Date().toISOString().slice(0, 10)}.yml`;
        document.body.appendChild(a);
        a.click();
        
        // Limpiar recursos
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        // Actualizar mensaje de información
        const fileInfo = document.getElementById(`fileInfo${playerIndex+1}`);
        fileInfo.textContent = `Datos guardados correctamente! ${new Date().toLocaleTimeString()}`;
        fileInfo.style.color = '#4caf50';
        
    } catch (error) {
        console.error('Error al guardar datos:', error);
        const fileInfo = document.getElementById(`fileInfo${playerIndex+1}`);
        fileInfo.textContent = `Error al guardar: ${error.message}`;
        fileInfo.style.color = '#d32f2f';
    }
}

// Funciones para manejar modales
function openModal(modalId, playerIndex) {
    currentPlayerIndex = playerIndex;
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Función para mostrar campos específicos según el tipo de objeto
function showItemFields() {
    // Ocultar todos los campos específicos primero
    document.querySelectorAll('.item-type-fields').forEach(el => {
        el.style.display = 'none';
    });
    
    // Mostrar campos según el tipo seleccionado
    const itemType = document.getElementById('itemType').value;
    if (itemType === 'arma') {
        document.getElementById('weaponFields').style.display = 'block';
    } else if (itemType === 'armadura') {
        document.getElementById('armorFields').style.display = 'block';
    } else if (itemType === 'escudo') {
        document.getElementById('shieldFields').style.display = 'block';
    }
}

// Función para agregar un nuevo consumible
function addConsumable() {
    const name = document.getElementById('consumableName').value;
    const quantity = parseInt(document.getElementById('consumableQuantity').value) || 1;
    
    // Validar que se haya ingresado un nombre
    if (!name) {
        alert('Por favor ingresa un nombre para el consumible');
        return;
    }
    
    const playerData = playersData[currentPlayerIndex];
    
    // Inicializar inventario si es necesario
    if (!playerData.inventario) playerData.inventario = {};
    if (!playerData.inventario.consumibles) playerData.inventario.consumibles = [];
    
    // Agregar nuevo consumible
    playerData.inventario.consumibles.push({
        nombre: name,
        cantidad: quantity
    });
    
    // Actualizar la vista y cerrar modal
    renderPlayer(currentPlayerIndex);
    closeModal('consumableModal');
    
    // Limpiar el formulario
    document.getElementById('consumableName').value = '';
    document.getElementById('consumableQuantity').value = '1';
}

// Función para agregar un nuevo objeto
function addItem() {
    const name = document.getElementById('itemName').value;
    const type = document.getElementById('itemType').value;
    const properties = document.getElementById('itemProperties').value;
    
    // Validar que se haya ingresado un nombre
    if (!name) {
        alert('Por favor ingresa un nombre para el objeto');
        return;
    }
    
    const newItem = {
        nombre: name,
        tipo: type
    };
    
    // Agregar propiedades específicas según el tipo
    if (type === 'arma') {
        newItem.daño = document.getElementById('weaponDamage').value || '1d6';
        if (document.getElementById('weaponProperties').value) {
            newItem.propiedades = [document.getElementById('weaponProperties').value];
        }
    } else if (type === 'armadura') {
        newItem.clase_armadura = parseInt(document.getElementById('armorClass').value) || 10;
        newItem.desv_stealth = document.getElementById('stealthDisadvantage').value === 'true';
    } else if (type === 'escudo') {
        newItem.bonus_ca = parseInt(document.getElementById('shieldBonus').value) || 2;
    }
    
    // Agregar propiedades adicionales si existen
    if (properties) {
        if (!newItem.propiedades) newItem.propiedades = [];
        newItem.propiedades.push(properties);
    }
    
    const playerData = playersData[currentPlayerIndex];
    
    // Inicializar inventario si es necesario
    if (!playerData.inventario) playerData.inventario = {};
    if (!playerData.inventario.objetos) playerData.inventario.objetos = [];
    
    // Agregar nuevo objeto
    playerData.inventario.objetos.push(newItem);
    
    // Actualizar la vista y cerrar modal
    renderPlayer(currentPlayerIndex);
    closeModal('itemModal');
    
    // Limpiar el formulario
    document.getElementById('itemName').value = '';
    document.getElementById('itemType').value = 'arma';
    document.getElementById('itemProperties').value = '';
    document.querySelectorAll('.item-type-fields').forEach(el => {
        el.style.display = 'none';
    });
}

// Función para eliminar un objeto
function deleteItem(playerIndex, type, itemIndex) {
    if (!confirm('¿Estás seguro de que quieres eliminar este objeto?')) return;
    
    const playerData = playersData[playerIndex];
    
    // Eliminar según el tipo de objeto
    if (type === 'consumible') {
        if (playerData.inventario && playerData.inventario.consumibles) {
            playerData.inventario.consumibles.splice(itemIndex, 1);
        }
    } else if (type === 'objeto') {
        if (playerData.inventario && playerData.inventario.objetos) {
            playerData.inventario.objetos.splice(itemIndex, 1);
        }
    }
    
    // Actualizar la vista
    renderPlayer(playerIndex);
}

// Función para equipar automáticamente según el tipo
function autoEquipItem(playerIndex, type, itemIndex) {
    const playerData = playersData[playerIndex];
    let item;
    
    // Manejar consumibles (reducir cantidad)
    if (type === 'consumible') {
        if (!playerData.inventario || !playerData.inventario.consumibles) return;
        item = playerData.inventario.consumibles[itemIndex];
        
        // Reducir cantidad
        if (item.cantidad > 0) {
            item.cantidad -= 1;
        }
        
        // Eliminar si la cantidad llega a cero
        if (item.cantidad <= 0) {
            playerData.inventario.consumibles.splice(itemIndex, 1);
        }
        
        renderPlayer(playerIndex);
        return;
    }
    
    // Manejar objetos (equipar en slot apropiado)
    if (!playerData.inventario || !playerData.inventario.objetos) return;
    item = playerData.inventario.objetos[itemIndex];
    
    // Determinar el slot según el tipo de objeto
    let slot;
    switch(item.tipo) {
        case 'arma':
            slot = 'arma_principal';
            break;
        case 'armadura':
            slot = 'armadura';
            break;
        case 'escudo':
            slot = 'escudo';
            break;
        case 'cabeza':
            slot = 'cabeza';
            break;
        case 'abalorio':
            slot = 'abalorio';
            break;
        default:
            // Para otros tipos, no hacemos nada
            return;
    }
    
    // Crear objeto equipado si no existe
    if (!playerData.equipado) playerData.equipado = {};
    
    // Equipar el objeto en el slot seleccionado
    playerData.equipado[slot] = item.nombre;
    
    // Actualizar la vista
    renderPlayer(playerIndex);
}

// Función para abrir el modal de estados alterados
function openConditionModal(playerIndex) {
    currentPlayerIndex = playerIndex;
    const playerData = playersData[playerIndex];
    
    // Generar opciones de condiciones
    let conditionsHTML = '';
    conditionOptions.forEach(condition => {
        // Comprobar si el estado ya está activo
        const isSelected = playerData.estados && 
            playerData.estados.some(est => {
                const estadoName = est.estado || est;
                return estadoName === condition;
            });
            
        conditionsHTML += `
            <div class="condition-option ${isSelected ? 'selected' : ''}" 
                    onclick="toggleConditionSelection(this, '${condition}')">
                ${condition}
            </div>
        `;
    });
    
    // Actualizar el modal y mostrarlo
    document.getElementById('conditionGrid').innerHTML = conditionsHTML;
    document.getElementById('conditionModal').style.display = 'flex';
}

// Función para seleccionar/deseleccionar una condición
function toggleConditionSelection(element, condition) {
    element.classList.toggle('selected');
}

// Función para guardar los estados seleccionados
function saveConditions() {
    const playerData = playersData[currentPlayerIndex];
    playerData.estados = [];
    
    // Obtener todas las condiciones seleccionadas
    document.querySelectorAll('.condition-option.selected').forEach(el => {
        playerData.estados.push({ estado: el.textContent.trim() });
    });
    
    // Actualizar la vista y cerrar modal
    renderPlayer(currentPlayerIndex);
    closeModal('conditionModal');
}

// Función para eliminar un estado alterado
function removeCondition(playerIndex, conditionIndex) { 
    const playerData = playersData[playerIndex];
    if (playerData.estados && playerData.estados.length > conditionIndex) {
        playerData.estados.splice(conditionIndex, 1);
        renderPlayer(playerIndex);
    }       
}

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {       
    // Renderizar datos iniciales para cada jugador
    for (let i = 0; i < 4; i++) {
        renderPlayer(i);
    }
    
    // Mostrar campos de arma por defecto en el modal de objetos
    document.getElementById('weaponFields').style.display = 'block';
});