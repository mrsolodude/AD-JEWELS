/* ==========================================================================
   AD JEWELS - 3D WebGL Tamil Classical Jewellery Engine (Three.js)
   ========================================================================== */

(function() {
    'use strict';

    // Global namespace exposure
    window.JewelryViewer = {
        init: init,
        changeProduct: changeProduct,
        updateMaterials: updateMaterials,
        setLightingMood: setLightingMood,
        toggleAutoRotate: toggleAutoRotate,
        triggerSparkleBurst: triggerSparkleBurst
    };

    // Engine Core Variables
    let scene, camera, renderer, orbitControls;
    let isInitialized = false;
    let mainGroup = null; // Container for the active jewellery model
    let activeProduct = 'jimikki';
    let currentMetal = 'antique';
    let currentGem = 'ruby';
    let currentMood = 'temple';
    
    // Animation properties
    let autoRotate = true;
    let lastTime = 0;
    
    // Lighting references
    let dirLight, ambientLight, spotLight1, spotLight2;
    
    // Sparkle Particle References
    let sparklesGroup = null;
    let diamondGemPositions = []; // Tracks where diamonds are to spawn sparkles
    let sparkleTexture = null;

    // Showroom Ambiance References
    let glimmerParticlesGroup = null;

    /**
     * Initializes the Three.js WebGL Showroom
     */
    function init(canvasId, loaderId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.log("No 3D canvas found. Skipping WebGL initialization.");
            return;
        }
        isInitialized = true;
        const container = canvas.parentNode;
        const loader = document.getElementById(loaderId);

        // 1. Create Scene
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x070709, 0.015);

        // 2. Create Camera
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
        camera.position.set(0, 5, 22);

        // 3. Create WebGL Renderer with High-End Realism Configs
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true // Required for Try-On screenshot capture
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // ACES Filmic tone mapping gives gold and gems a high-end metallic finish
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.35;

        // 4. Setup Orbit Interaction Controls
        orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;
        orbitControls.maxPolarAngle = Math.PI / 1.8; // Don't let user navigate too far underneath
        orbitControls.minDistance = 8;
        orbitControls.maxDistance = 35;
        orbitControls.autoRotate = false; // Manually controlled in loop for custom speed control

        // 5. Generate Sparkle Texture procedurally to avoid CDN loading issues
        createSparkleTexture();

        // 5b. Generate Procedural HDRI Environment Map for highly-polished gold reflections
        scene.environment = createProceduralEnvMap();

        // 6. Setup Lighting & Atmosphere
        setupLighting();
        setLightingMood('temple');

        // 6b. Add Showroom Ambiance: Polished obsidian pedestal & gold particle dust!
        createShowroomAmbiance();

        // 7. Load Active Product
        loadProductModel(activeProduct);

        // 8. Start Animation Render Loop
        requestAnimationFrame(renderLoop);

        // 9. Handle Responsive Resizing
        window.addEventListener('resize', onWindowResize);

        // 9b. Setup Raycasting for interactive click selection on parts of the 3D model
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        canvas.addEventListener('click', (event) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            if (productGroup) {
                const intersects = raycaster.intersectObjects(productGroup.children, true);
                if (intersects.length > 0) {
                    const hit = intersects.find(i => i.object.userData && i.object.userData.type);
                    if (hit) {
                        const hitType = hit.object.userData.type;
                        const partClickedEvent = new CustomEvent('jewelry-part-clicked', { detail: { type: hitType } });
                        canvas.dispatchEvent(partClickedEvent);
                    }
                }
            }
        });

        // 10. Clear Loading Overlay after a brief procedural rendering simulation
        setTimeout(() => {
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 500);
            }
        }, 1200);
    }

    /**
     * Creates a glowing lens flare star texture procedurally in canvas
     */
    function createSparkleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Draw a clean, 4-point golden/white starburst lens flare
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(255, 248, 220, 0.9)');
        gradient.addColorStop(0.3, 'rgba(252, 246, 186, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        // Drawing thin cross flares
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        // Horizontal bar
        ctx.moveTo(8, 32);
        ctx.lineTo(56, 32);
        // Vertical bar
        ctx.moveTo(32, 8);
        ctx.lineTo(32, 56);
        ctx.stroke();

        sparkleTexture = new THREE.CanvasTexture(canvas);
    }

    /**
     * Initializes core showroom lighting
     */
    function setupLighting() {
        // Soft primary ambient light
        ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        // Directional Sun Light to project bright highlights
        dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
        dirLight.position.set(10, 15, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.bias = -0.0001;
        scene.add(dirLight);

        // Spotlight 1: Direct key light for glimmers
        spotLight1 = new THREE.SpotLight(0xffd700, 2.5, 30, Math.PI / 6, 0.5, 1);
        spotLight1.position.set(-10, 8, 8);
        scene.add(spotLight1);

        // Spotlight 2: Fill light for diamonds
        spotLight2 = new THREE.SpotLight(0xffffff, 1.5, 30, Math.PI / 4, 0.5, 1);
        spotLight2.position.set(10, 8, -8);
        scene.add(spotLight2);

        // Floor reflection helper plane underneath the model
        const shadowPlaneGeo = new THREE.PlaneGeometry(30, 30);
        const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.15 });
        const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = -6.5;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);
    }

    /**
     * Adjusts the lights based on selected mood
     */
    function setLightingMood(mood) {
        currentMood = mood;
        if (!scene) return;

        if (mood === 'temple') {
            // Warm ancient temple gold atmosphere
            scene.background = null; // Transparent to see background CSS glow
            ambientLight.color.setHex(0x5c0d16); // Kemp-red ambient shadows
            ambientLight.intensity = 0.45;
            
            dirLight.color.setHex(0xffba3b); // Deep golden key light
            dirLight.intensity = 1.5;
            
            spotLight1.color.setHex(0xffd700); // Amber highlight
            spotLight1.intensity = 2.0;
            
            spotLight2.color.setHex(0xff8c00); // Sunset back fill
            spotLight2.intensity = 1.0;
        } 
        else if (mood === 'showroom') {
            // High brilliance clean studio spot
            ambientLight.color.setHex(0x223344); // Slate blue ambient
            ambientLight.intensity = 0.35;
            
            dirLight.color.setHex(0xffffff); // Pure white sunlight
            dirLight.intensity = 2.0;
            
            spotLight1.color.setHex(0xffffff); // Intense diamond key
            spotLight1.intensity = 3.0;
            
            spotLight2.color.setHex(0xe3f2fd); // Soft sky fill
            spotLight2.intensity = 1.5;
        } 
        else if (mood === 'moonlight') {
            // Royal platinum moonlit ambiance
            ambientLight.color.setHex(0x0f172a); // Deep obsidian navy shadows
            ambientLight.intensity = 0.5;
            
            dirLight.color.setHex(0x94a3b8); // Cool silver key
            dirLight.intensity = 1.0;
            
            spotLight1.color.setHex(0xb2ebf2); // Ice blue accent
            spotLight1.intensity = 1.8;
            
            spotLight2.color.setHex(0xe2e8f0); // Pale moonlight glow
            spotLight2.intensity = 0.8;
        }
    }

    /**
     * Materials Factory - Computes realistic PBR finishes
     */
    function getJewelryMaterial(purpose) {
        // Purpose can be: 'metal', 'gem_accent', 'gem_diamond'
        
        // 1. Metal Alloy Computations
        if (purpose === 'metal') {
            const matConfig = {
                metalness: 1.0,
                clearcoat: 0.9,
                clearcoatRoughness: 0.1,
                envMapIntensity: 1.25
            };

            if (currentMetal === 'antique') {
                return new THREE.MeshPhysicalMaterial(Object.assign({
                    color: 0xaa7c1c, // Rich reddish antique gold
                    roughness: 0.28,
                    reflectivity: 0.75
                }, matConfig));
            } 
            else if (currentMetal === 'yellow') {
                return new THREE.MeshPhysicalMaterial(Object.assign({
                    color: 0xe6b825, // Brilliant shining 22K gold
                    roughness: 0.12,
                    reflectivity: 0.95
                }, matConfig));
            } 
            else if (currentMetal === 'rose') {
                return new THREE.MeshPhysicalMaterial(Object.assign({
                    color: 0xcca091, // Modern rose gold warmth
                    roughness: 0.16,
                    reflectivity: 0.85
                }, matConfig));
            } 
            else if (currentMetal === 'platinum') {
                return new THREE.MeshPhysicalMaterial(Object.assign({
                    color: 0xdee3e7, // Super premium cold white metal
                    roughness: 0.08,
                    reflectivity: 1.0
                }, matConfig));
            }
        }

        // 2. Gemstones Computations
        let gemColor = 0xcc0033; // Default kemp ruby
        let transmissionVal = 0.55;
        let iorVal = 1.77; // Ruby IOR

        if (currentGem === 'ruby') {
            gemColor = 0xb3002d; // Classic Kemp Ruby deep crimson
            transmissionVal = 0.5;
            iorVal = 1.77;
        } 
        else if (currentGem === 'emerald') {
            gemColor = 0x07613e; // Saturated Chola Emerald green
            transmissionVal = 0.6;
            iorVal = 1.58; // Emerald IOR
        } 
        else if (currentGem === 'diamond') {
            gemColor = 0xffffff;
            transmissionVal = 0.95; // Extreme transparency
            iorVal = 2.417; // Diamond refractive IOR!
        } 
        else if (currentGem === 'sapphire') {
            gemColor = 0x0f2954; // Midnight Royal Blue
            transmissionVal = 0.45;
            iorVal = 1.76;
        }

        if (purpose === 'gem_accent') {
            // Main colored stones
            return new THREE.MeshPhysicalMaterial({
                color: gemColor,
                roughness: 0.02,
                metalness: 0.0,
                transmission: transmissionVal,
                ior: iorVal,
                thickness: 0.5,
                specularIntensity: 1.0,
                clearcoat: 1.0,
                clearcoatRoughness: 0.0
            });
        } 
        else if (purpose === 'gem_diamond') {
            // Secondary framing stones (always diamonds for extreme premium contrast)
            return new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                roughness: 0.0,
                metalness: 0.0,
                transmission: 0.96,
                ior: 2.417,
                thickness: 0.8,
                specularIntensity: 1.0,
                clearcoat: 1.0
            });
        }

        // Fallback standard material
        return new THREE.MeshStandardMaterial({ color: 0x9c0c1b });
    }

    /**
     * Triggers dynamic changes in product models
     */
    function changeProduct(productId) {
        if (!isInitialized) return;
        if (productId === activeProduct) return;
        activeProduct = productId;
        loadProductModel(activeProduct);
    }

    /**
     * Updates active materials instantly when user selects customization card
     */
    function updateMaterials(metalId, gemId) {
        if (!isInitialized) return;
        currentMetal = metalId || currentMetal;
        currentGem = gemId || currentGem;

        if (!mainGroup) return;

        // Traverse mesh trees and swap materials safely
        mainGroup.traverse(child => {
            if (child.isMesh && child.userData) {
                if (child.userData.type === 'metal') {
                    child.material = getJewelryMaterial('metal');
                } 
                else if (child.userData.type === 'gem_accent') {
                    child.material = getJewelryMaterial('gem_accent');
                } 
                else if (child.userData.type === 'gem_diamond') {
                    child.material = getJewelryMaterial('gem_diamond');
                }
            }
        });
        
        // Re-generate diamond sparkle positions since material traits swapped
        setupSparkleStars();
    }

    /**
     * Toggles Orbit Control Auto Rotation
     */
    function toggleAutoRotate() {
        autoRotate = !autoRotate;
        return autoRotate;
    }

    /**
     * Triggers a burst of gorgeous floating sparkles
     */
    function triggerSparkleBurst() {
        if (!sparklesGroup) return;
        
        // Momentarily scale up active diamond sparkles to create a dazzling camera burst
        sparklesGroup.children.forEach(sprite => {
            const initialScale = sprite.userData.baseScale || 0.5;
            
            // GSAP-like smooth transition in manual ticks
            sprite.userData.burstProgress = 1.0;
        });
    }

    /**
     * Clears current models and builds the active Tamil masterpiece
     */
    function loadProductModel(productId) {
        if (mainGroup) {
            scene.remove(mainGroup);
            // Dispose geometries and materials for performance cleanup
            mainGroup.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        }

        // Initialize parent container group
        mainGroup = new THREE.Group();
        diamondGemPositions = []; // Reset tracked sparkle vectors
        
        // Create matching container coordinates
        const productContainer = new THREE.Group();
        productContainer.name = productId;
        
        if (productId === 'jimikki') {
            buildJimikkiEarring(productContainer);
            productContainer.position.set(0, 1.5, 0);
        } 
        else if (productId === 'kasumalai') {
            buildKasuMalaiNecklace(productContainer);
            productContainer.position.set(0, -1, 0);
        } 
        else if (productId === 'vanki') {
            buildVankiArmlet(productContainer);
            productContainer.position.set(0, 0, 0);
        } 
        else if (productId === 'mangamalai') {
            buildMangaMalaiChoker(productContainer);
            productContainer.position.set(0, -0.5, 0);
        }

        mainGroup.add(productContainer);
        scene.add(mainGroup);

        // Spawn interactive Diamond Twinkle Particle Sprites on top of the gems!
        setupSparkleStars();
    }

    /* ==========================================================================
       PROCEDURAL Tamil Classical Geometry Builders
       ========================================================================== */

    /**
     * BUILDER: The Jimikki Earring (Traditional swaying temple dome earring)
     */
    function buildJimikkiEarring(parent) {
        const metalMat = getJewelryMaterial('metal');
        const gemAccentMat = getJewelryMaterial('gem_accent');
        const gemDiamondMat = getJewelryMaterial('gem_diamond');

        // Create a dual pair of earrings placed side by side
        const leftEarring = new THREE.Group();
        const rightEarring = new THREE.Group();

        // Build single earring tree
        buildSingleJimikkiUnit(leftEarring, metalMat, gemAccentMat, gemDiamondMat);
        buildSingleJimikkiUnit(rightEarring, metalMat, gemAccentMat, gemDiamondMat);

        leftEarring.position.x = -3.2;
        rightEarring.position.x = 3.2;

        parent.add(leftEarring);
        parent.add(rightEarring);
    }

    function buildSingleJimikkiUnit(earringGroup, metalMat, gemAccentMat, gemDiamondMat) {
        // 1. Upper Floral Stud (Sunburst shape)
        const studGroup = new THREE.Group();
        studGroup.position.y = 4.5;
        
        // Central thick backing disc
        const backingGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.25, 32);
        const backing = new THREE.Mesh(backingGeo, metalMat);
        backing.rotation.x = Math.PI / 2;
        backing.userData = { type: 'metal' };
        studGroup.add(backing);

        // Large Central Accent Gem
        const centerGemGeo = new THREE.SphereGeometry(0.55, 16, 16);
        const centerGem = new THREE.Mesh(centerGemGeo, gemAccentMat);
        centerGem.scale.set(1, 1, 0.6);
        centerGem.position.z = 0.15;
        centerGem.userData = { type: 'gem_accent' };
        studGroup.add(centerGem);

        // Stamp a beautiful royal gold logo monogram on the central stud
        const logo = createADLogoMonogram(0.68);
        logo.position.set(0, 0, 0.24); // Protrude forward slightly
        studGroup.add(logo);

        // Circular Crown of Diamonds (8 brilliant stones)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 0.95;
            const diaGeo = new THREE.OctahedronGeometry(0.18, 1);
            const diamond = new THREE.Mesh(diaGeo, gemDiamondMat);
            
            diamond.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.1);
            diamond.userData = { type: 'gem_diamond' };
            studGroup.add(diamond);

            // Keep track of diamond coordinates for sparkle engine
            diamondGemPositions.push(diamond);
        }

        // 8 gold floral petals framing the diamonds
        for (let i = 0; i < 8; i++) {
            const angle = ((i + 0.5) / 8) * Math.PI * 2;
            const radius = 1.35;
            const petalGeo = new THREE.SphereGeometry(0.24, 16, 8);
            const petal = new THREE.Mesh(petalGeo, metalMat);
            petal.scale.set(0.6, 1.5, 0.4);
            petal.rotation.z = angle - Math.PI / 2;
            
            petal.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.0);
            petal.userData = { type: 'metal' };
            studGroup.add(petal);
        }

        earringGroup.add(studGroup);

        // 2. Connecting Loop (Chain links)
        const chainGeo = new THREE.TorusGeometry(0.4, 0.08, 8, 24);
        
        const link1 = new THREE.Mesh(chainGeo, metalMat);
        link1.position.set(0, 3.2, 0);
        link1.userData = { type: 'metal' };
        earringGroup.add(link1);

        const link2 = new THREE.Mesh(chainGeo, metalMat);
        link2.position.set(0, 2.6, 0);
        link2.rotation.y = Math.PI / 2;
        link2.userData = { type: 'metal' };
        earringGroup.add(link2);

        // 3. Lower Dome (The swaying bell Jhumka container)
        // Grouped together to apply kinetic sway in animation loop
        const bellSwayGroup = new THREE.Group();
        bellSwayGroup.name = "sway_dome";
        bellSwayGroup.position.set(0, 2.3, 0); // Rotation axis located at top chain pivot
        
        const bellSubContainer = new THREE.Group();
        bellSubContainer.position.set(0, -2.3, 0); // Offset translation so rotation occurs at pivot
        bellSwayGroup.add(bellSubContainer);

        // The golden bell dome
        const domeGeo = new THREE.SphereGeometry(1.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, metalMat);
        dome.rotation.x = Math.PI; // Flip dome downwards
        dome.position.y = 1.8;
        dome.userData = { type: 'metal' };
        bellSubContainer.add(dome);

        // Upper connector cap
        const capGeo = new THREE.CylinderGeometry(0.5, 0.8, 0.4, 16);
        const cap = new THREE.Mesh(capGeo, metalMat);
        cap.position.y = 2.0;
        cap.userData = { type: 'metal' };
        bellSubContainer.add(cap);

        // Decorative raised concentric ring around middle of dome
        const middleTorusGeo = new THREE.TorusGeometry(1.4, 0.1, 8, 32);
        const middleTorus = new THREE.Mesh(middleTorusGeo, metalMat);
        middleTorus.rotation.x = Math.PI / 2;
        middleTorus.position.y = 1.1;
        middleTorus.userData = { type: 'metal' };
        bellSubContainer.add(middleTorus);

        // Concentric Gems Ring wrapping the bottom rim (14 kemp rubies)
        const gemRingCount = 14;
        const gemRingRadius = 1.62;
        for (let i = 0; i < gemRingCount; i++) {
            const angle = (i / gemRingCount) * Math.PI * 2;
            const gemGeo = new THREE.SphereGeometry(0.18, 12, 12);
            const gem = new THREE.Mesh(gemGeo, gemAccentMat);
            gem.scale.set(1, 1, 0.7);
            
            gem.position.set(Math.cos(angle) * gemRingRadius, 0.22, Math.sin(angle) * gemRingRadius);
            gem.userData = { type: 'gem_accent' };
            bellSubContainer.add(gem);
        }

        // Hanging Bottom Beads/Pearls (16 delicate gold drops swaying)
        const beadCount = 16;
        const beadRadius = 1.62;
        const dropletGroup = new THREE.Group();
        dropletGroup.name = "droplets";

        for (let i = 0; i < beadCount; i++) {
            const angle = (i / beadCount) * Math.PI * 2;
            const pos = new THREE.Vector3(Math.cos(angle) * beadRadius, 0.1, Math.sin(angle) * beadRadius);

            const dropUnit = new THREE.Group();
            dropUnit.position.copy(pos);

            // Micro gold ring connector
            const microRingGeo = new THREE.TorusGeometry(0.12, 0.03, 6, 12);
            const microRing = new THREE.Mesh(microRingGeo, metalMat);
            microRing.rotation.y = angle;
            microRing.userData = { type: 'metal' };
            dropUnit.add(microRing);

            // Teardrop pearl or gold bead
            const beadGeo = new THREE.SphereGeometry(0.15, 12, 12);
            const bead = new THREE.Mesh(beadGeo, metalMat);
            bead.scale.set(0.8, 1.4, 0.8);
            bead.position.y = -0.32;
            bead.userData = { type: 'metal' };
            dropUnit.add(bead);
            
            // Add a tiny diamond point at base of droplet for sparkle highlights
            const tinyDiaGeo = new THREE.OctahedronGeometry(0.06, 1);
            const tinyDia = new THREE.Mesh(tinyDiaGeo, gemDiamondMat);
            tinyDia.position.y = -0.52;
            tinyDia.userData = { type: 'gem_diamond' };
            dropUnit.add(tinyDia);
            
            diamondGemPositions.push(tinyDia);

            dropletGroup.add(dropUnit);
        }
        bellSubContainer.add(dropletGroup);

        earringGroup.add(bellSwayGroup);
    }

    /**
     * BUILDER: Kasu Malai (Necklace curved strand of Lakshmi Coins)
     */
    function buildKasuMalaiNecklace(parent) {
        const metalMat = getJewelryMaterial('metal');
        const gemAccentMat = getJewelryMaterial('gem_accent');
        const gemDiamondMat = getJewelryMaterial('gem_diamond');

        // Draw double gold tubular choker frame supporting the coins
        const bandCurveLeft = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-4.5, 4, 0),
            new THREE.Vector3(-3.5, -2.5, 0.5),
            new THREE.Vector3(0, -3.5, 1)
        );
        const bandCurveRight = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(4.5, 4, 0),
            new THREE.Vector3(3.5, -2.5, 0.5),
            new THREE.Vector3(0, -3.5, 1)
        );

        // Core gold strands supporting coins
        const tubeGeoLeft = new THREE.TubeGeometry(bandCurveLeft, 64, 0.12, 12, false);
        const tubeLeft1 = new THREE.Mesh(tubeGeoLeft, metalMat);
        tubeLeft1.userData = { type: 'metal' };
        parent.add(tubeLeft1);

        const tubeGeoRight = new THREE.TubeGeometry(bandCurveRight, 64, 0.12, 12, false);
        const tubeRight1 = new THREE.Mesh(tubeGeoRight, metalMat);
        tubeRight1.userData = { type: 'metal' };
        parent.add(tubeRight1);

        // Overlapping Lakshmi Coins plotted along the curve
        const coinCount = 13; // Per side
        const coinsGroup = new THREE.Group();

        // Render left-side coins
        for (let i = 0; i < coinCount; i++) {
            const t = i / (coinCount - 1);
            const pos = bandCurveLeft.getPointAt(t);
            const tangent = bandCurveLeft.getTangentAt(t);

            const coinMesh = createLakshmiCoinMesh(metalMat, gemAccentMat);
            coinMesh.position.copy(pos);
            
            // Align coin to point facing outwards along tangent
            alignMeshAlongTangent(coinMesh, tangent);
            coinMesh.rotation.z += 0.2; // Overlap styling angle
            
            coinsGroup.add(coinMesh);
        }

        // Render right-side coins (skip first central coin to prevent duplicate center clash)
        for (let i = 1; i < coinCount; i++) {
            const t = i / (coinCount - 1);
            const pos = bandCurveRight.getPointAt(t);
            const tangent = bandCurveRight.getTangentAt(t);

            const coinMesh = createLakshmiCoinMesh(metalMat, gemAccentMat);
            coinMesh.position.copy(pos);
            
            alignMeshAlongTangent(coinMesh, tangent);
            coinMesh.rotation.y = Math.PI - coinMesh.rotation.y; // Mirror rotation
            coinMesh.rotation.z -= 0.2;
            
            coinsGroup.add(coinMesh);
        }

        parent.add(coinsGroup);

        // Heavy center pendant (Madurai Temple floral shield)
        const pendantGroup = new THREE.Group();
        pendantGroup.position.set(0, -3.8, 1.2);

        // Core shield disc
        const shieldGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.25, 32);
        const shield = new THREE.Mesh(shieldGeo, metalMat);
        shield.rotation.x = Math.PI / 2;
        shield.userData = { type: 'metal' };
        pendantGroup.add(shield);

        // Heart faceted Ruby center
        const shieldGemGeo = new THREE.SphereGeometry(0.7, 16, 16);
        const shieldGem = new THREE.Mesh(shieldGemGeo, gemAccentMat);
        shieldGem.scale.set(1, 1, 0.5);
        centerJewelryMesh(shieldGem);
        shieldGem.userData = { type: 'gem_accent' };
        pendantGroup.add(shieldGem);

        // Add royal "AD" hallmark monogram right at the center of the medallion shield
        const logo = createADLogoMonogram(0.85);
        logo.position.set(0, 0, 0.26);
        pendantGroup.add(logo);

        // Diamond framing ring around the shield (10 diamonds)
        const outerCount = 10;
        const outerRadius = 1.05;
        for (let i = 0; i < outerCount; i++) {
            const angle = (i / outerCount) * Math.PI * 2;
            const gemGeo = new THREE.OctahedronGeometry(0.18, 1);
            const gem = new THREE.Mesh(gemGeo, gemDiamondMat);
            
            gem.position.set(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius, 0.1);
            gem.userData = { type: 'gem_diamond' };
            pendantGroup.add(gem);

            diamondGemPositions.push(gem);
        }

        // Dangling emerald and gold pearls below the shield
        for (let i = -2; i <= 2; i++) {
            const drop = new THREE.Group();
            const angle = (i * 25 * Math.PI) / 180;
            const length = 1.5;
            
            drop.position.set(Math.sin(angle) * 1.3, -Math.cos(angle) * 1.3, 0.1);

            const connectorGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8);
            const connector = new THREE.Mesh(connectorGeo, metalMat);
            connector.position.y = 0.15;
            connector.userData = { type: 'metal' };
            drop.add(connector);

            const beadGeo = new THREE.SphereGeometry(0.15, 12, 12);
            // Alternate center drops with custom rubies and gold
            const bead = new THREE.Mesh(beadGeo, (i % 2 === 0) ? gemAccentMat : metalMat);
            bead.scale.set(1, 1.5, 1);
            bead.userData = { type: (i % 2 === 0) ? 'gem_accent' : 'metal' };
            drop.add(bead);
            
            if (i % 2 === 0) {
                // Tracking diamond/ruby highlight tips
                diamondGemPositions.push(bead);
            }

            pendantGroup.add(drop);
        }

        parent.add(pendantGroup);
    }

    function createLakshmiCoinMesh(metalMat, gemAccentMat) {
        const coin = new THREE.Group();

        // Main Coin Disc
        const discGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.08, 24);
        const disc = new THREE.Mesh(discGeo, metalMat);
        disc.rotation.x = Math.PI / 2;
        disc.userData = { type: 'metal' };
        coin.add(disc);

        // Lakshmi embossed relief dome in center of coin
        const reliefGeo = new THREE.SphereGeometry(0.35, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const relief = new THREE.Mesh(reliefGeo, metalMat);
        relief.position.z = 0.05;
        relief.userData = { type: 'metal' };
        coin.add(relief);

        // Decorative outer cord-border torus framing the coin
        const cordGeo = new THREE.TorusGeometry(0.58, 0.04, 6, 24);
        const cord = new THREE.Mesh(cordGeo, metalMat);
        cord.userData = { type: 'metal' };
        coin.add(cord);

        // Single tiny ruby bead setting on top of coin joint
        const rubyTopGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const rubyTop = new THREE.Mesh(rubyTopGeo, gemAccentMat);
        rubyTop.position.set(0, 0.72, 0.04);
        rubyTop.userData = { type: 'gem_accent' };
        coin.add(rubyTop);

        return coin;
    }

    /**
     * BUILDER: The Vanki (Traditional peacock V-shaped Armlet)
     */
    function buildVankiArmlet(parent) {
        const metalMat = getJewelryMaterial('metal');
        const gemAccentMat = getJewelryMaterial('gem_accent');
        const gemDiamondMat = getJewelryMaterial('gem_diamond');

        // 1. Armlet C-Band wrapping behind
        const armletCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-4.5, -0.5, -2.5),
            new THREE.Vector3(-4.5, 0.2, 0),
            new THREE.Vector3(-1.8, 1.2, 2.0),
            new THREE.Vector3(0, 1.8, 2.2), // The V-peak top
            new THREE.Vector3(1.8, 1.2, 2.0),
            new THREE.Vector3(4.5, 0.2, 0),
            new THREE.Vector3(4.5, -0.5, -2.5)
        ]);

        const bandTubeGeo = new THREE.TubeGeometry(armletCurve, 64, 0.16, 12, false);
        const bandTube = new THREE.Mesh(bandTubeGeo, metalMat);
        bandTube.userData = { type: 'metal' };
        parent.add(bandTube);

        // Second parallel lower accent band
        const lowerCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-4.5, -1.0, -2.5),
            new THREE.Vector3(-4.2, -0.4, 0),
            new THREE.Vector3(-1.8, 0.5, 2.0),
            new THREE.Vector3(0, 0.8, 2.2),
            new THREE.Vector3(1.8, 0.5, 2.0),
            new THREE.Vector3(4.2, -0.4, 0),
            new THREE.Vector3(4.5, -1.0, -2.5)
        ]);
        const lowerTubeGeo = new THREE.TubeGeometry(lowerCurve, 64, 0.08, 8, false);
        const lowerTube = new THREE.Mesh(lowerTubeGeo, metalMat);
        lowerTube.userData = { type: 'metal' };
        parent.add(lowerTube);

        // 2. The Royal Peacock centerpiece sitting on the V-peak
        const peacockGroup = new THREE.Group();
        peacockGroup.position.set(0, 1.8, 2.3);

        // Elegant curved body of the peacock
        const bodyGeo = new THREE.SphereGeometry(0.7, 16, 16);
        const body = new THREE.Mesh(bodyGeo, metalMat);
        body.scale.set(1, 1.3, 0.8);
        body.rotation.x = -Math.PI / 6;
        body.userData = { type: 'metal' };
        peacockGroup.add(body);

        // S-curve neck tube
        const neckCurve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0, 0.6, 0.2),
            new THREE.Vector3(-0.3, 1.4, 0.8),
            new THREE.Vector3(0, 1.8, 0.5)
        );
        const neckGeo = new THREE.TubeGeometry(neckCurve, 16, 0.16, 8, false);
        const neck = new THREE.Mesh(neckGeo, metalMat);
        neck.userData = { type: 'metal' };
        peacockGroup.add(neck);

        // Head and beak
        const headGeo = new THREE.SphereGeometry(0.24, 12, 12);
        const head = new THREE.Mesh(headGeo, metalMat);
        head.position.set(0, 1.8, 0.5);
        head.userData = { type: 'metal' };
        peacockGroup.add(head);

        const beakGeo = new THREE.ConeGeometry(0.08, 0.3, 4);
        const beak = new THREE.Mesh(beakGeo, metalMat);
        beak.position.set(0.08, 1.7, 0.65);
        beak.rotation.z = -Math.PI / 3;
        beak.rotation.x = Math.PI / 10;
        beak.userData = { type: 'metal' };
        peacockGroup.add(beak);

        // Colombian Emerald eye
        const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const eye = new THREE.Mesh(eyeGeo, gemAccentMat);
        eye.position.set(0.18, 1.88, 0.62);
        eye.userData = { type: 'gem_accent' };
        peacockGroup.add(eye);

        // 3. Ornate Fan Tail behind the peacock
        const tailGroup = new THREE.Group();
        tailGroup.position.set(0, 0.2, -0.2);

        const fanCount = 7;
        for (let i = 0; i < fanCount; i++) {
            const angle = ((i - 3) * 22 * Math.PI) / 180;
            const length = 1.75;
            
            const feather = new THREE.Group();
            feather.rotation.z = angle;

            // Feathers gold wire
            const wireGeo = new THREE.CylinderGeometry(0.05, 0.05, length, 8);
            const wire = new THREE.Mesh(wireGeo, metalMat);
            wire.position.y = length / 2;
            wire.userData = { type: 'metal' };
            feather.add(wire);

            // Teardrop gem crest on feather tip
            const crestGeo = new THREE.SphereGeometry(0.25, 12, 12);
            const crest = new THREE.Mesh(crestGeo, gemAccentMat);
            crest.scale.set(0.7, 1.4, 0.5);
            crest.position.set(0, length, 0.05);
            crest.userData = { type: 'gem_accent' };
            feather.add(crest);

            // Shimmering diamond centered inside the gem
            const innerDiaGeo = new THREE.OctahedronGeometry(0.1, 1);
            const innerDia = new THREE.Mesh(innerDiaGeo, gemDiamondMat);
            innerDia.position.set(0, length, 0.12);
            innerDia.userData = { type: 'gem_diamond' };
            feather.add(innerDia);

            diamondGemPositions.push(innerDia);

            tailGroup.add(feather);
        }
        peacockGroup.add(tailGroup);

        // 4. Gemstone leaf rows contouring the V-peak band edges
        for (let i = 1; i <= 6; i++) {
            const leftLeaf = new THREE.Group();
            const rightLeaf = new THREE.Group();

            const posLeft = armletCurve.getPointAt(0.5 - (i * 0.06));
            const tangentLeft = armletCurve.getTangentAt(0.5 - (i * 0.06));
            
            const posRight = armletCurve.getPointAt(0.5 + (i * 0.06));
            const tangentRight = armletCurve.getTangentAt(0.5 + (i * 0.06));

            // Small beveled gemstone leaf setting
            const leafGeo = new THREE.SphereGeometry(0.22, 12, 8);
            
            const leafL = new THREE.Mesh(leafGeo, gemAccentMat);
            leafL.scale.set(0.5, 1.2, 0.4);
            leafL.userData = { type: 'gem_accent' };
            leftLeaf.add(leafL);

            // Outer golden bead accent
            const beadGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const beadL = new THREE.Mesh(beadGeo, metalMat);
            beadL.position.y = 0.4;
            beadL.userData = { type: 'metal' };
            leftLeaf.add(beadL);

            const leafR = new THREE.Mesh(leafGeo, gemAccentMat);
            leafR.scale.set(0.5, 1.2, 0.4);
            leafR.userData = { type: 'gem_accent' };
            rightLeaf.add(leafR);

            const beadR = new THREE.Mesh(beadGeo, metalMat);
            beadR.position.y = 0.4;
            beadR.userData = { type: 'metal' };
            rightLeaf.add(beadR);

            // Position and rotate left leaves
            leftLeaf.position.copy(posLeft);
            alignMeshAlongTangent(leftLeaf, tangentLeft);
            leftLeaf.rotation.z += 0.8;
            parent.add(leftLeaf);

            // Position and rotate right leaves
            rightLeaf.position.copy(posRight);
            alignMeshAlongTangent(rightLeaf, tangentRight);
            rightLeaf.rotation.y = Math.PI - rightLeaf.rotation.y;
            rightLeaf.rotation.z -= 0.8;
            parent.add(rightLeaf);

            // Track leaves for diamond sparkles if gemstone customized to diamond
            diamondGemPositions.push(leafL);
            diamondGemPositions.push(leafR);
        }

        // 5. Heavy pear kemp drop dangling from central V peak
        const peakDrop = new THREE.Group();
        peakDrop.position.set(0, 0.2, 2.3);

        const capGeo = new THREE.ConeGeometry(0.24, 0.4, 12);
        const cap = new THREE.Mesh(capGeo, metalMat);
        cap.position.y = 0.25;
        cap.rotation.x = Math.PI;
        cap.userData = { type: 'metal' };
        peakDrop.add(cap);

        const heavyGemGeo = new THREE.SphereGeometry(0.48, 16, 16);
        const heavyGem = new THREE.Mesh(heavyGemGeo, gemAccentMat);
        heavyGem.scale.set(0.8, 1.6, 0.6);
        heavyGem.position.y = -0.35;
        heavyGem.userData = { type: 'gem_accent' };
        peakDrop.add(heavyGem);

        parent.add(peakDrop);
        parent.add(peacockGroup);

        // Add AD branding crest on the V-armlet center plate
        const logo = createADLogoMonogram(0.85);
        logo.position.set(0, 0.8, 2.45);
        parent.add(logo);
    }

    /**
     * BUILDER: Kemp Manga Malai (Choker with traditional beveled mango motifs)
     */
    function buildMangaMalaiChoker(parent) {
        const metalMat = getJewelryMaterial('metal');
        const gemAccentMat = getJewelryMaterial('gem_accent');
        const gemDiamondMat = getJewelryMaterial('gem_diamond');

        // Solid golden circular choker collar band
        const collarCurve = new THREE.EllipseCurve(
            0, 0,            // Center x, y
            4.2, 3.8,        // xRadius, yRadius
            Math.PI * 0.08,  // Start Angle
            Math.PI * 0.92,  // End Angle
            false,           // Clockwise
            0                // Rotation
        );

        // Get matching coordinates for tube geometry
        const points = collarCurve.getPoints(64);
        const points3D = points.map(p => new THREE.Vector3(p.x, p.y * 0.8 - 0.5, -p.y * 0.1));
        const finalCurve = new THREE.CatmullRomCurve3(points3D);

        const collarTubeGeo = new THREE.TubeGeometry(finalCurve, 64, 0.18, 12, false);
        const collarTube = new THREE.Mesh(collarTubeGeo, metalMat);
        collarTube.rotation.x = -Math.PI / 2; // Lie flat on neck
        collarTube.userData = { type: 'metal' };
        parent.add(collarTube);

        // Extrude shape for beveled classical "Manga" (Mango) settings
        const mangaShape = buildTraditionalMangoShape();
        
        // Extrude parameters for high fidelity beveled gold settings
        const extrudeSettings = {
            steps: 1,
            depth: 0.14,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.03,
            bevelOffset: 0,
            bevelSegments: 3
        };

        const mangaGeometry = new THREE.ExtrudeGeometry(mangaShape, extrudeSettings);
        centerGeometryPivot(mangaGeometry); // Pivot at the top joint hook

        // Array to place mango units along collar
        const mangaCount = 14;
        const mangaGroup = new THREE.Group();
        mangaGroup.rotation.x = -Math.PI / 2; // Match collar lie

        for (let i = 0; i < mangaCount; i++) {
            const t = i / (mangaCount - 1);
            const pos = collarCurve.getPointAt(t);
            const tangent = collarCurve.getTangentAt(t);

            const mangaUnit = new THREE.Group();
            
            // Core beveled gold mango shell mesh
            const goldManga = new THREE.Mesh(mangaGeometry, metalMat);
            goldManga.rotation.x = Math.PI; // Point downwards
            goldManga.scale.set(0.04, 0.04, 0.04);
            goldManga.userData = { type: 'metal' };
            mangaUnit.add(goldManga);

            // Nested Kemp Gem setting inside mango body
            const gemMangaShape = buildTraditionalMangoShape(true); // Slightly smaller nested path
            const gemMangaGeo = new THREE.ExtrudeGeometry(gemMangaShape, Object.assign({}, extrudeSettings, { depth: 0.18 }));
            centerGeometryPivot(gemMangaGeo);
            
            const gemManga = new THREE.Mesh(gemMangaGeo, gemAccentMat);
            gemManga.rotation.x = Math.PI;
            gemManga.position.z = 0.06;
            gemManga.scale.set(0.036, 0.036, 0.04);
            gemManga.userData = { type: 'gem_accent' };
            mangaUnit.add(gemManga);

            // Single sparkling diamond crown in center of mango
            const centerDiaGeo = new THREE.OctahedronGeometry(0.18, 1);
            const centerDia = new THREE.Mesh(centerDiaGeo, gemDiamondMat);
            centerDia.position.set(0, -0.6, 0.18);
            centerDia.userData = { type: 'gem_diamond' };
            mangaUnit.add(centerDia);

            // Small gold seed bead at very tip hook of mango
            const tipBeadGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const tipBead = new THREE.Mesh(tipBeadGeo, metalMat);
            tipBead.position.set(0.25, -1.35, 0.08);
            tipBead.userData = { type: 'metal' };
            mangaUnit.add(tipBead);

            // Set coordinates along collar path
            mangaUnit.position.set(pos.x, pos.y, -pos.y * 0.1);
            
            // Face outward along curve
            mangaUnit.rotation.z = Math.atan2(tangent.y, tangent.x) - Math.PI / 2;
            
            mangaGroup.add(mangaUnit);

            diamondGemPositions.push(centerDia);
        }

        parent.add(mangaGroup);

        // Add AD branding medallion in front center of Manga Malai choker
        const logo = createADLogoMonogram(1.05);
        logo.position.set(0, -3.92, 0.18);
        logo.rotation.x = Math.PI / 2; // Lie flat/oriented towards camera
        parent.add(logo);
    }

    /**
     * Helper to draw mathematical 2D bezier curves outlining traditional South Indian mango motif
     */
    function buildTraditionalMangoShape(nested = false) {
        const shape = new THREE.Shape();
        const factor = nested ? 0.8 : 1.0;

        // Path coordinates tracing a sweeping recurved South Indian mango motif
        shape.moveTo(0 * factor, 0 * factor);
        shape.bezierCurveTo(
            -8 * factor, -2 * factor, 
            -18 * factor, -12 * factor, 
            -18 * factor, -24 * factor
        );
        shape.bezierCurveTo(
            -18 * factor, -36 * factor, 
            -6 * factor, -45 * factor, 
            0 * factor, -46 * factor
        );
        shape.bezierCurveTo(
            12 * factor, -47 * factor, 
            20 * factor, -35 * factor, 
            16 * factor, -20 * factor
        );
        
        // Recurved hooked tip
        shape.bezierCurveTo(
            14 * factor, -10 * factor, 
            10 * factor, -2 * factor, 
            6 * factor, 0 * factor
        );
        shape.quadraticCurveTo(
            4 * factor, 4 * factor, 
            0 * factor, 0 * factor
        );

        return shape;
    }

    /**
     * Procedural builder for the luxury 'AD' brand monogram crest
     */
    function createADLogoMonogram(scaleVal = 1.0) {
        const metalMat = getJewelryMaterial('metal');
        const logoGroup = new THREE.Group();
        logoGroup.name = "ad_logo";

        // 1. Thin back circular gold plaque
        const plaqueGeo = new THREE.CylinderGeometry(0.55 * scaleVal, 0.55 * scaleVal, 0.04 * scaleVal, 32);
        const plaque = new THREE.Mesh(plaqueGeo, metalMat);
        plaque.rotation.x = Math.PI / 2;
        plaque.position.z = -0.03 * scaleVal;
        plaque.userData = { type: 'metal' };
        logoGroup.add(plaque);

        // 2. Raised border outer ring
        const borderGeo = new THREE.TorusGeometry(0.51 * scaleVal, 0.03 * scaleVal, 6, 32);
        const border = new THREE.Mesh(borderGeo, metalMat);
        border.position.z = -0.01 * scaleVal;
        border.userData = { type: 'metal' };
        logoGroup.add(border);

        // 3. Center vertical divider (shared stem of A and D - exact height of 0.6)
        const centerBarGeo = new THREE.BoxGeometry(0.05 * scaleVal, 0.6 * scaleVal, 0.05 * scaleVal);
        const centerBar = new THREE.Mesh(centerBarGeo, metalMat);
        centerBar.position.set(0, 0, 0.02 * scaleVal);
        centerBar.userData = { type: 'metal' };
        logoGroup.add(centerBar);

        // 4. Slanted left leg of A (length of 0.65, angled at 0.39 rad, perfectly intersects peak at y=0.3)
        const leftLegGeo = new THREE.BoxGeometry(0.05 * scaleVal, 0.65 * scaleVal, 0.05 * scaleVal);
        const leftLeg = new THREE.Mesh(leftLegGeo, metalMat);
        leftLeg.rotation.z = 0.39;
        leftLeg.position.set(-0.125 * scaleVal, 0, 0.02 * scaleVal);
        leftLeg.userData = { type: 'metal' };
        logoGroup.add(leftLeg);

        // 5. Horizontal Crossbar of A (connects exactly between slanted leg and center stem at y=-0.08)
        const crossBarGeo = new THREE.BoxGeometry(0.158 * scaleVal, 0.04 * scaleVal, 0.05 * scaleVal);
        const crossBar = new THREE.Mesh(crossBarGeo, metalMat);
        crossBar.position.set(-0.079 * scaleVal, -0.08 * scaleVal, 0.02 * scaleVal);
        crossBar.userData = { type: 'metal' };
        logoGroup.add(crossBar);

        // 6. Right curve of D (radius of 0.3, perfectly connects at y=0.3 and y=-0.3)
        const dCurveGeo = new THREE.TorusGeometry(0.3 * scaleVal, 0.04 * scaleVal, 8, 24, Math.PI);
        const dCurve = new THREE.Mesh(dCurveGeo, metalMat);
        dCurve.rotation.z = -Math.PI / 2;
        dCurve.position.set(0, 0, 0.02 * scaleVal);
        dCurve.userData = { type: 'metal' };
        logoGroup.add(dCurve);

        return logoGroup;
    }

    /* ==========================================================================
       THREE.JS Math Alignments & Pivot Helpers
       ========================================================================== */

    function alignMeshAlongTangent(mesh, tangent) {
        const angle = Math.atan2(tangent.y, tangent.x);
        mesh.rotation.z = angle - Math.PI / 2;
        mesh.rotation.y = 0;
        mesh.rotation.x = Math.PI / 2; // Facing towards active camera view plane
    }

    function centerGeometryPivot(geometry) {
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, 0, -center.z); // Pivot located at top horizontal center
    }

    function centerJewelryMesh(mesh) {
        mesh.geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        mesh.geometry.boundingBox.getCenter(center);
        mesh.geometry.translate(-center.x, -center.y, -center.z);
    }

    function centerGeometryPivot(geometry) {
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, 0, -center.z);
    }

    /* ==========================================================================
       DIAMOND TWINKLE SPARKLE SYSTEM
       ========================================================================== */

    function setupSparkleStars() {
        if (sparklesGroup) {
            scene.remove(sparklesGroup);
        }

        sparklesGroup = new THREE.Group();

        const sparkleMat = new THREE.SpriteMaterial({
            map: sparkleTexture,
            color: 0xffffff,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Loop through all collected diamond meshes and attach a floating light sprite
        diamondGemPositions.forEach((diamondMesh, idx) => {
            const sprite = new THREE.Sprite(sparkleMat.clone());
            
            // Randomize start phase so starbursts glimmer out of sync
            sprite.userData = {
                phase: Math.random() * Math.PI * 2,
                speed: 1.5 + Math.random() * 2,
                baseScale: 0.2 + Math.random() * 0.3,
                parentMesh: diamondMesh,
                burstProgress: 0.0
            };

            sprite.scale.set(0, 0, 1);
            sparklesGroup.add(sprite);
        });

        scene.add(sparklesGroup);
    }

    /**
     * Renders sparkles animations under manual render loop ticks
     */
    function updateSparklesAnimation(time) {
        if (!sparklesGroup) return;

        sparklesGroup.children.forEach(sprite => {
            const parent = sprite.userData.parentMesh;
            if (!parent) return;

            // Get absolute position of parent diamond in scene space
            const worldPosition = new THREE.Vector3();
            parent.getWorldPosition(worldPosition);
            
            // Align sprite position with a slight forward offset to avoid z-fighting clipping
            sprite.position.copy(worldPosition);
            sprite.position.z += 0.25;

            // Twinkle calculation: compute sinus scale
            const phase = sprite.userData.phase;
            const speed = sprite.userData.speed;
            const baseScale = sprite.userData.baseScale;
            
            // Compute sin glimmer factor
            let glimmer = Math.sin(time * speed + phase);
            glimmer = Math.max(0, glimmer); // Don't scale negative

            let finalScale = baseScale * glimmer;

            // Apply burst triggers (rapidly expand and decay)
            if (sprite.userData.burstProgress > 0.0) {
                const burstFactor = Math.sin(sprite.userData.burstProgress * Math.PI) * 2.2;
                finalScale += burstFactor;
                sprite.userData.burstProgress -= 0.04; // Decay progress
            }

            // Apply scaling
            sprite.scale.set(finalScale, finalScale, 1);
            
            // Rotates flares gently
            sprite.material.rotation = time * 0.3 + phase;
        });
    }

    /* ==========================================================================
       RENDER LOOP & CONTROLLERS
       ========================================================================== */

    function renderLoop(timestamp) {
        const time = timestamp * 0.001; // Convert to seconds
        
        // Handle delta calculations
        const delta = time - lastTime;
        lastTime = time;

        if (mainGroup) {
            // Apply gentle auto-orbit rotation
            if (autoRotate) {
                mainGroup.rotation.y += 0.005;
            }

            // Apply physical sway oscillation to Jimikki domes if active
            const activeDomePair = mainGroup.getObjectByName('jimikki');
            if (activeDomePair) {
                activeDomePair.children.forEach(earring => {
                    const swayDome = earring.getObjectByName('sway_dome');
                    if (swayDome) {
                        // Apply sine-cosine sway rotation to simulate air currents
                        swayDome.rotation.z = Math.sin(time * 2.2) * 0.06;
                        swayDome.rotation.x = Math.cos(time * 1.5) * 0.03;
                        
                        // Subtle delayed sway on individual hanging droplets
                        const droplets = swayDome.getObjectByName('droplets');
                        if (droplets) {
                            droplets.children.forEach((drop, idx) => {
                                drop.rotation.z = Math.sin(time * 2.8 + idx) * 0.04;
                            });
                        }
                    }
                });
            }
        }

        // Update floating gold dust glimmer particles drift and twinkle
        if (glimmerParticlesGroup) {
            glimmerParticlesGroup.children.forEach(p => {
                const data = p.userData;
                p.position.y += data.speedY * delta;
                p.position.x += Math.sin(time * 0.8 + data.phase) * data.speedX * delta;
                
                if (p.position.y > 6.0) {
                    p.position.y = -6.0;
                }
                
                p.material.opacity = data.baseOpacity + Math.sin(time * 1.5 + data.phase) * 0.25;
            });
        }

        // Update diamond sparkle star flare glimmers
        updateSparklesAnimation(time);

        // Update orbital controls
        if (orbitControls) {
            orbitControls.update();
        }

        // Render Frame
        renderer.render(scene, camera);

        // Keep loop running
        requestAnimationFrame(renderLoop);
    }

    /**
     * Responsive Resizing
     */
    function onWindowResize() {
        const canvas = renderer.domElement;
        const container = canvas.parentNode;

        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    /**
     * Generates a high-fidelity golden-champagne equirectangular environment reflection map procedurally
     */
    function createProceduralEnvMap() {
        const envCanvas = document.createElement('canvas');
        envCanvas.width = 512;
        envCanvas.height = 256;
        const envCtx = envCanvas.getContext('2d');

        const envGrad = envCtx.createLinearGradient(0, 0, 0, envCanvas.height);
        envGrad.addColorStop(0, '#070709');
        envGrad.addColorStop(0.3, '#101014');
        envGrad.addColorStop(0.48, '#aa7c1c'); // Raised golden bar
        envGrad.addColorStop(0.5, '#fcf6ba');  // Central reflection shine
        envGrad.addColorStop(0.52, '#aa7c1c'); // Lower gold boundary
        envGrad.addColorStop(0.7, '#101014');
        envGrad.addColorStop(1, '#070709');

        envCtx.fillStyle = envGrad;
        envCtx.fillRect(0, 0, envCanvas.width, envCanvas.height);

        envCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        envCtx.beginPath();
        envCtx.arc(150, 100, 70, 0, Math.PI * 2);
        envCtx.fill();

        envCtx.beginPath();
        envCtx.arc(362, 120, 50, 0, Math.PI * 2);
        envCtx.fill();

        const envTexture = new THREE.CanvasTexture(envCanvas);
        envTexture.mapping = THREE.EquirectangularReflectionMapping;
        return envTexture;
    }

    /**
     * Generates a polished black marble display pedestal with gold trims & active floating glimmer dust particles
     */
    function createShowroomAmbiance() {
        const metalMat = getJewelryMaterial('metal');

        // 1. Polished Obsidian Marble Pedestal Stand
        const pedestalGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.7, 32);
        const pedestalMat = new THREE.MeshPhysicalMaterial({
            color: 0x0a0a0d,
            metalness: 0.95,
            roughness: 0.08,
            clearcoat: 1.0,
            clearcoatRoughness: 0.02,
            reflectivity: 1.0
        });
        const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
        pedestal.position.y = -6.1;
        pedestal.receiveShadow = true;
        scene.add(pedestal);

        // 2. High-shine gold trim wrapping the pedestal cap (updates dynamically with metal selectors)
        const pedestalTrimGeo = new THREE.TorusGeometry(3.51, 0.04, 8, 48);
        const pedestalTrim = new THREE.Mesh(pedestalTrimGeo, metalMat);
        pedestalTrim.rotation.x = Math.PI / 2;
        pedestalTrim.position.y = -5.75;
        pedestalTrim.userData = { type: 'metal' };
        scene.add(pedestalTrim);

        // 3. Floating Glimmer Dust Particles
        glimmerParticlesGroup = new THREE.Group();
        
        const particleGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const particleMat = new THREE.MeshBasicMaterial({
            color: 0xffd54f,
            transparent: true,
            opacity: 0.7
        });

        for (let i = 0; i < 45; i++) {
            const particle = new THREE.Mesh(particleGeo, particleMat.clone());
            particle.position.set(
                Math.random() * 16 - 8,
                Math.random() * 10 - 5,
                Math.random() * 14 - 7
            );
            particle.userData = {
                speedY: 0.15 + Math.random() * 0.25,
                speedX: 0.1 + Math.random() * 0.2,
                phase: Math.random() * Math.PI * 2,
                baseOpacity: 0.2 + Math.random() * 0.5
            };
            glimmerParticlesGroup.add(particle);
        }

        scene.add(glimmerParticlesGroup);
    }

})();
