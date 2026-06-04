import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const LIGHTHOUSE_POS = new THREE.Vector3(0, 0, -20);
const FIREFLY_COUNT = 120;

const canvas = document.getElementById("c");
const loadingEl = document.getElementById("loading");
const fpsEl = document.getElementById("fps");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.012);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
camera.position.set(22, 14, 26);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 4, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 4;
controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI * 0.49;

scene.background = new THREE.CubeTextureLoader()
	.setPath("./skybox/")
	.load(["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"]);
scene.background.colorSpace = THREE.SRGBColorSpace;

const texLoader = new THREE.TextureLoader();

function tileTex(url, rx = 1, ry = 1) {
	const t = texLoader.load(url);
	t.colorSpace = THREE.SRGBColorSpace;
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(rx, ry);
	t.anisotropy = 8;
	return t;
}

const grassTex = tileTex("./textures/grass.png", 32, 32);
const dirtTex = tileTex("./textures/dirt.png", 4, 4);
const stoneTex = tileTex("./textures/stone.png", 2, 2);
const wallTex = tileTex("./textures/wall.png", 1, 1);
const wallTexSingle = texLoader.load("./textures/wall.png");
wallTexSingle.colorSpace = THREE.SRGBColorSpace;

const ambient = new THREE.AmbientLight(0x445577, 0.18);
const hemi = new THREE.HemisphereLight(0x88aaff, 0x224422, 0.35);
scene.add(ambient, hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.bias = -0.0008;
Object.assign(sun.shadow.camera, {
	left: -50,
	right: 50,
	top: 50,
	bottom: -50,
	near: 1,
	far: 150,
});
scene.add(sun, sun.target);

const spot = new THREE.SpotLight(0xffe9a8, 6, 80, Math.PI / 9, 0.4, 1);
spot.position.set(LIGHTHOUSE_POS.x, 11.8, LIGHTHOUSE_POS.z);
scene.add(spot, spot.target);

const BOX = new THREE.BoxGeometry(1, 1, 1);
const CONE = new THREE.ConeGeometry(0.6, 1, 16);
const CYL = new THREE.CylinderGeometry(0.4, 0.4, 1, 18);
const SPHERE = new THREE.SphereGeometry(0.5, 24, 18);
const ICO = new THREE.IcosahedronGeometry(0.5, 0);
const DODECA = new THREE.DodecahedronGeometry(0.5, 0);
const TORUS = new THREE.TorusGeometry(0.5, 0.16, 12, 32);

const matRoof = new THREE.MeshStandardMaterial({
	color: 0x8a3a2a,
	roughness: 0.8,
});
const matWood = new THREE.MeshStandardMaterial({
	color: 0x5a3a22,
	roughness: 0.9,
});
const matLeaves = new THREE.MeshStandardMaterial({
	color: 0x2a7a3a,
	roughness: 0.85,
});
const matWall = new THREE.MeshStandardMaterial({
	map: wallTex,
	roughness: 0.9,
});
const matStone = new THREE.MeshStandardMaterial({
	map: stoneTex,
	roughness: 0.95,
});
const matCrystal = new THREE.MeshStandardMaterial({
	color: 0x88ccff,
	roughness: 0.15,
	metalness: 0.6,
	emissive: 0x224466,
	emissiveIntensity: 0.5,
});

const ground = new THREE.Mesh(
	new THREE.PlaneGeometry(200, 200),
	new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;

const plaza = new THREE.Mesh(
	new THREE.CircleGeometry(8, 48),
	new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 1 }),
);
plaza.rotation.x = -Math.PI / 2;
plaza.position.y = 0.02;
plaza.receiveShadow = true;

scene.add(ground, plaza);

function makeHouse(x, z, rot, wallMaterial = matWall) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	g.rotation.y = rot;

	const body = new THREE.Mesh(BOX, wallMaterial);
	body.scale.set(3.2, 2.6, 3);
	body.position.y = 1.3;
	body.castShadow = body.receiveShadow = true;

	const roof = new THREE.Mesh(CONE, matRoof);
	roof.scale.set(3, 2, 3);
	roof.position.y = 3.6;
	roof.rotation.y = Math.PI / 4;
	roof.castShadow = true;

	const door = new THREE.Mesh(
		BOX,
		new THREE.MeshStandardMaterial({ color: 0x3a2410, roughness: 0.85 }),
	);
	door.scale.set(0.7, 1.2, 0.05);
	door.position.set(0, 0.6, 1.52);

	g.add(body, roof, door);
	scene.add(g);
}

function makeTree(x, z, scale) {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	g.scale.setScalar(scale);

	const trunk = new THREE.Mesh(CYL, matWood);
	trunk.scale.set(0.6, 3, 0.6);
	trunk.position.y = 1.5;
	trunk.castShadow = true;

	const leaves = new THREE.Mesh(ICO, matLeaves);
	leaves.scale.setScalar(2.4);
	leaves.position.y = 4;
	leaves.castShadow = true;

	g.add(trunk, leaves);
	scene.add(g);
}

makeHouse(-10, -7, 0.2);
makeHouse(10, -7, -0.2);
makeHouse(
	-10,
	7,
	-0.4,
	new THREE.MeshStandardMaterial({
		map: wallTex,
		color: 0xddccaa,
		roughness: 0.9,
	}),
);
makeHouse(10, 7, 0.5);

const TREES = [
	[-18, -14, 1.0],
	[18, -14, 1.1],
	[-22, 0, 0.9],
	[22, 0, 1.2],
	[-18, 14, 1.0],
	[18, 16, 1.1],
	[0, 22, 1.3],
];
for (const [x, z, s] of TREES) makeTree(x, z, s);

for (let i = 0; i < 8; i++) {
	const t = i / 7;
	const r = 14 - t * 8;
	const ang = -Math.PI / 2 + t * 0.4;
	const stone = new THREE.Mesh(BOX, matStone);
	stone.scale.set(1.2, 0.3, 1.2);
	stone.position.set(Math.cos(ang) * r, 0.15, Math.sin(ang) * r);
	stone.rotation.y = Math.random() * 0.4;
	stone.castShadow = stone.receiveShadow = true;
	scene.add(stone);
}

const well = new THREE.Group();
well.position.set(-4.5, 0, 4.5);

const wellBody = new THREE.Mesh(CYL, matStone);
wellBody.scale.set(1, 1.4, 1);
wellBody.position.y = 0.7;
wellBody.castShadow = wellBody.receiveShadow = true;

const wellRim = new THREE.Mesh(TORUS, matStone);
wellRim.scale.setScalar(2.1);
wellRim.position.y = 1.4;
wellRim.rotation.x = Math.PI / 2;

well.add(wellBody, wellRim);
scene.add(well);

const lighthouse = new THREE.Group();
lighthouse.position.copy(LIGHTHOUSE_POS);

const lhBase = new THREE.Mesh(CYL, matStone);
lhBase.scale.set(1.6, 12, 1.6);
lhBase.position.y = 6;
lhBase.castShadow = true;

const lhRoof = new THREE.Mesh(CONE, matRoof);
lhRoof.scale.set(2.4, 2.5, 2.4);
lhRoof.position.y = 13;

const lhLamp = new THREE.Mesh(
	new THREE.CylinderGeometry(1, 1, 1, 18, 1, true),
	new THREE.MeshStandardMaterial({
		color: 0xffeeaa,
		emissive: 0xffaa66,
		emissiveIntensity: 2.5,
		side: THREE.DoubleSide,
		roughness: 0.5,
	}),
);
lhLamp.position.y = 11.6;

lighthouse.add(lhBase, lhRoof, lhLamp);
scene.add(lighthouse);

const fire = new THREE.Group();

for (let i = 0; i < 4; i++) {
	const log = new THREE.Mesh(CYL, matWood);
	log.scale.set(0.18, 1.4, 0.18);
	log.rotation.z = Math.PI / 2;
	log.rotation.y = (i / 4) * Math.PI;
	log.position.y = 0.2;
	log.castShadow = true;
	fire.add(log);
}

const embers = new THREE.Mesh(
	SPHERE,
	new THREE.MeshStandardMaterial({
		color: 0xff5500,
		emissive: 0xff3300,
		emissiveIntensity: 3,
		roughness: 0.8,
	}),
);
embers.scale.set(0.7, 0.18, 0.7);
embers.position.y = 0.22;

const flameOuter = new THREE.Mesh(
	new THREE.ConeGeometry(0.5, 1.4, 16, 1, true),
	new THREE.MeshBasicMaterial({
		color: 0xff7722,
		transparent: true,
		opacity: 0.55,
		side: THREE.DoubleSide,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	}),
);
flameOuter.position.y = 0.9;

const flameInner = new THREE.Mesh(
	new THREE.ConeGeometry(0.28, 1, 14, 1, true),
	new THREE.MeshBasicMaterial({
		color: 0xffdd66,
		transparent: true,
		opacity: 0.85,
		side: THREE.DoubleSide,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	}),
);
flameInner.position.y = 0.75;

const fireLight = new THREE.PointLight(0xff7733, 10, 22, 1.7);
fireLight.position.y = 1;

fire.add(embers, flameOuter, flameInner, fireLight);
scene.add(fire);

const lanterns = [];
const lanternLights = [];

function makeLantern(x, y, z, color) {
	const g = new THREE.Group();
	g.position.set(x, y, z);

	const sphere = new THREE.Mesh(
		SPHERE,
		new THREE.MeshStandardMaterial({
			color,
			emissive: color,
			emissiveIntensity: 2,
			roughness: 0.4,
			metalness: 0.1,
		}),
	);
	sphere.scale.setScalar(0.6);

	const cap = new THREE.Mesh(
		CYL,
		new THREE.MeshStandardMaterial({ color: 0x222222 }),
	);
	cap.scale.set(0.25, 0.15, 0.25);
	cap.position.y = 0.45;

	const light = new THREE.PointLight(color, 6, 18, 1.6);

	g.add(sphere, cap, light);
	scene.add(g);

	lanterns.push({ group: g, baseY: y, phase: Math.random() * Math.PI * 2 });
	lanternLights.push(light);
}

makeLantern(-4, 5.5, -2, 0xffcc66);
makeLantern(5, 6.2, 3, 0x88ccff);
makeLantern(-2, 7, 6, 0xff88cc);
makeLantern(7, 5.8, -5, 0x99ff99);
makeLantern(-7, 6.5, 4, 0xccaaff);

const crystal1 = new THREE.Mesh(ICO, matCrystal);
crystal1.scale.setScalar(1.2);
crystal1.position.set(4.5, 0.9, 4.5);
crystal1.castShadow = true;

const crystal2 = new THREE.Mesh(DODECA, matCrystal);
crystal2.scale.setScalar(1);
crystal2.position.set(-4.5, 0.7, -4.5);
crystal2.castShadow = true;

const crystal3 = new THREE.Mesh(ICO, matCrystal.clone());
crystal3.material.color.set(0xffaaff);
crystal3.material.emissive.set(0x662266);
crystal3.scale.setScalar(0.8);
crystal3.position.set(0, 0.5, -6);
crystal3.castShadow = true;

const decoTorus = new THREE.Mesh(
	new THREE.TorusGeometry(1.2, 0.18, 16, 64),
	new THREE.MeshStandardMaterial({
		color: 0xddaa55,
		roughness: 0.4,
		metalness: 0.9,
	}),
);
decoTorus.position.set(4.5, 2.5, 4.5);
decoTorus.castShadow = true;

const decoKnot = new THREE.Mesh(
	new THREE.TorusKnotGeometry(0.7, 0.22, 96, 16),
	new THREE.MeshStandardMaterial({
		color: 0x55ddaa,
		roughness: 0.3,
		metalness: 0.8,
		emissive: 0x113322,
		emissiveIntensity: 0.4,
	}),
);
decoKnot.position.set(-4.5, 2.5, -4.5);
decoKnot.castShadow = true;

scene.add(crystal1, crystal2, crystal3, decoTorus, decoKnot);

let foxMixer = null;

new GLTFLoader().load(
	"./models/Fox.glb",
	(gltf) => {
		const fox = gltf.scene;
		fox.scale.setScalar(0.035);
		fox.position.set(2.5, 0, 2.5);
		fox.traverse((o) => {
			if (o.isMesh) o.castShadow = o.receiveShadow = true;
		});
		scene.add(fox);

		if (gltf.animations?.length) {
			foxMixer = new THREE.AnimationMixer(fox);
			foxMixer.clipAction(gltf.animations[0]).play();
		}
		loadingEl.classList.add("hidden");
	},
	undefined,
	(err) => {
		console.warn("Failed to load Fox.glb", err);
		const fallback = new THREE.Mesh(
			BOX,
			new THREE.MeshStandardMaterial({ map: wallTexSingle }),
		);
		fallback.scale.set(1.2, 1.2, 1.2);
		fallback.position.set(2.5, 0.6, 2.5);
		fallback.castShadow = true;
		scene.add(fallback);
		loadingEl.classList.add("hidden");
	},
);

const fireflyMat = new THREE.MeshBasicMaterial({
	color: 0xfff2aa,
	transparent: true,
});
const fireflies = new THREE.InstancedMesh(
	new THREE.SphereGeometry(0.06, 6, 6),
	fireflyMat,
	FIREFLY_COUNT,
);
const fireflyData = [];

for (let i = 0; i < FIREFLY_COUNT; i++) {
	fireflyData.push({
		radius: 6 + Math.random() * 22,
		angle: Math.random() * Math.PI * 2,
		speed: 0.1 + Math.random() * 0.25,
		baseY: 0.5 + Math.random() * 5,
		bobSpeed: 0.5 + Math.random() * 1.5,
		bobAmp: 0.3 + Math.random() * 0.8,
		phase: Math.random() * Math.PI * 2,
	});
}
scene.add(fireflies);

const ui = {
	sun: document.getElementById("sun"),
	sunV: document.getElementById("sunV"),
	btnAuto: document.getElementById("btnAuto"),
	btnLanterns: document.getElementById("btnLanterns"),
	btnFire: document.getElementById("btnFire"),
	btnSpot: document.getElementById("btnSpot"),
	btnFireflies: document.getElementById("btnFireflies"),
};

let autoCycle = true;
let lanternsOn = true;
let fireOn = true;
let spotOn = true;
let firefliesOn = true;
let fireBaseIntensity = 8;

const toggleBtn = (btn, on) => btn.classList.toggle("on", on);
const refresh = () => applyTimeOfDay(parseFloat(ui.sun.value));

ui.btnAuto.onclick = () => {
	autoCycle = !autoCycle;
	toggleBtn(ui.btnAuto, autoCycle);
	ui.btnAuto.textContent = `Auto Cycle: ${autoCycle ? "ON" : "OFF"}`;
};

ui.btnLanterns.onclick = () => {
	lanternsOn = !lanternsOn;
	toggleBtn(ui.btnLanterns, lanternsOn);
	for (const l of lanternLights) l.visible = lanternsOn;
	refresh();
};

ui.btnFire.onclick = () => {
	fireOn = !fireOn;
	toggleBtn(ui.btnFire, fireOn);
	fireLight.visible = fireOn;
	flameInner.visible = fireOn;
	flameOuter.visible = fireOn;
	embers.visible = fireOn;
	refresh();
};

ui.btnSpot.onclick = () => {
	spotOn = !spotOn;
	toggleBtn(ui.btnSpot, spotOn);
	spot.visible = spotOn;
	refresh();
};

ui.btnFireflies.onclick = () => {
	firefliesOn = !firefliesOn;
	toggleBtn(ui.btnFireflies, firefliesOn);
	fireflies.visible = firefliesOn;
};

ui.sun.oninput = () => {
	autoCycle = false;
	toggleBtn(ui.btnAuto, false);
	ui.btnAuto.textContent = "Auto Cycle: OFF";
	refresh();
};

function applyTimeOfDay(t) {
	ui.sun.value = t;
	ui.sunV.textContent = t.toFixed(2);

	const ang = (t - 0.5) * Math.PI * 2;
	const sunY = Math.sin(ang + Math.PI / 2);
	const sunX = Math.cos(ang + Math.PI / 2);
	sun.position.set(sunX * 60, Math.max(sunY, -0.2) * 60, 25);
	sun.target.position.set(0, 0, 0);
	sun.target.updateMatrixWorld();

	const day = THREE.MathUtils.clamp(sunY * 1.2, 0, 1);
	const night = 1 - day;
	const horizon = 1 - Math.min(Math.abs(sunY) * 2, 1);

	sun.color.setRGB(1, 0.6 + 0.4 * (1 - horizon), 0.4 + 0.6 * (1 - horizon));
	sun.intensity = day * 2 + 0.05;
	if (day < 0.05) sun.color.setRGB(0.5, 0.55, 0.9);

	ambient.intensity = 0.15 + day * 0.25;
	hemi.intensity = 0.2 + day * 0.6;
	scene.fog.color.setRGB(0.05 + day * 0.5, 0.05 + day * 0.55, 0.1 + day * 0.6);

	for (const l of lanternLights)
		l.intensity = (lanternsOn ? 1 : 0) * (3 + night * 5);
	fireBaseIntensity = (fireOn ? 1 : 0) * (4 + night * 8);
	spot.intensity = (spotOn ? 1 : 0) * (2 + night * 6);
	fireflyMat.opacity = night;
	fireflies.visible = firefliesOn && night > 0.05;

	renderer.toneMappingExposure = 0.7 + day * 0.5;
}

applyTimeOfDay(parseFloat(ui.sun.value));

function resize() {
	const w = canvas.clientWidth;
	const h = canvas.clientHeight;
	if (canvas.width !== w || canvas.height !== h) {
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}
}

const flameFlicker = (t) =>
	0.85 + 0.1 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 13.1 + 1.7);

const clock = new THREE.Clock();
const tmpMat = new THREE.Matrix4();
let fpsAccum = 0;
let fpsFrames = 0;

function tick() {
	const dt = clock.getDelta();
	const t = clock.elapsedTime;

	if (autoCycle) applyTimeOfDay((t * 0.012 + 0.18) % 1);

	for (const L of lanterns) {
		L.group.position.y = L.baseY + Math.sin(t * 1.2 + L.phase) * 0.35;
		L.group.rotation.y = Math.sin(t * 0.3 + L.phase) * 0.3;
	}

	const flick = flameFlicker(t);
	fireLight.intensity = fireBaseIntensity * flick;
	flameOuter.scale.set(flick, 0.9 + 0.15 * Math.sin(t * 5.1), flick);
	flameInner.scale.set(
		0.95 + 0.08 * Math.sin(t * 9.7),
		0.95 + 0.12 * Math.sin(t * 6.3 + 0.8),
		0.95 + 0.08 * Math.cos(t * 9.7),
	);
	flameOuter.rotation.y += dt * 1.5;
	flameInner.rotation.y -= dt * 2.1;
	embers.material.emissiveIntensity = 2.5 + 0.8 * Math.sin(t * 4);

	decoKnot.rotation.x += dt * 0.6;
	decoKnot.rotation.y += dt * 0.8;
	decoTorus.rotation.z += dt * 0.5;
	crystal1.rotation.y += dt * 0.5;
	crystal2.rotation.y -= dt * 0.4;
	crystal3.rotation.x += dt * 0.7;

	const a = t * 0.6;
	spot.target.position.set(Math.cos(a) * 40, 0, Math.sin(a) * 40 - 20);
	spot.target.updateMatrixWorld();

	for (let i = 0; i < FIREFLY_COUNT; i++) {
		const f = fireflyData[i];
		const a2 = f.angle + t * f.speed;
		tmpMat.makeTranslation(
			Math.cos(a2) * f.radius,
			f.baseY + Math.sin(t * f.bobSpeed + f.phase) * f.bobAmp,
			Math.sin(a2) * f.radius,
		);
		fireflies.setMatrixAt(i, tmpMat);
	}
	fireflies.instanceMatrix.needsUpdate = true;

	if (foxMixer) foxMixer.update(dt);

	controls.update();
	resize();
	renderer.render(scene, camera);

	fpsAccum += dt;
	fpsFrames++;
	if (fpsAccum >= 0.5) {
		fpsEl.textContent = `FPS: ${(fpsFrames / fpsAccum).toFixed(0)}`;
		fpsAccum = 0;
		fpsFrames = 0;
	}

	requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
