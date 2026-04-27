const CHUNK_SIZE      = 32;
const MAX_HEIGHT      = 32;
const RENDER_DISTANCE = 15;
const MAX_SLOTS       = 1024;
const SLOT_CAPACITY   = 2048;
const LOADS_PER_FRAME = 4;

const TEX_GRASS = 0;
const TEX_WALL  = 1;
const TEX_DIRT  = 2;
const TEX_STONE = 3;

var COLOR_SKY = [0.45, 0.65, 0.95, 1];


// Face packing: slot:10 | lx:5 | lz:5 | y:5 | dir:3 | tex:2 | unused:1 | valid:1
function packFace(slot, lx, lz, y, dir, tex) {
	return slot
		| (lx  << 10)
		| (lz  << 15)
		| (y   << 20)
		| (dir << 25)
		| (tex << 28)
		| (1   << 31);
}


function chunkRand(cx, cz, seed) {
	let n = ((cx | 0) * 374761393 + (cz | 0) * 668265263 + (seed | 0) * 982451653) | 0;

	n = (n ^ (n >>> 13)) | 0;
	n = Math.imul(n, 1274126177) | 0;

	return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}


function terrainHeight(x, z) {
	const f1 = Math.sin(x * 0.012) * Math.cos(z * 0.014) * 4.0;
	const f2 = Math.sin(x * 0.030 + 1.3) * 2.0;
	const f3 = Math.cos(z * 0.027 - 0.7) * 2.0;
	const f4 = Math.sin((x + z) * 0.009) * 3.0;
	const f5 = Math.cos((x - z) * 0.008) * 2.5;
	const f6 = Math.sin(x * 0.06) * Math.cos(z * 0.07) * 0.8;

	const h = Math.round(8 + (f1 + f2 + f3 + f4 + f5 + f6) * 1.5);

	return Math.max(1, Math.min(MAX_HEIGHT - 2, h));
}


function textureForHeight(h) {
	if (h <= 5)  return TEX_GRASS;
	if (h <= 14) return TEX_DIRT;

	return TEX_STONE;
}


class Chunk {
	constructor(cx, cz) {
		this.cx = cx;
		this.cz = cz;
		this.slot = -1;

		this.heightMap = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
		this.texMap    = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
		this.faces     = new Uint32Array(0);
		this.bats      = [];
	}

	generate() {
		for (let lz = 0; lz < CHUNK_SIZE; lz++) {
			for (let lx = 0; lx < CHUNK_SIZE; lx++) {
				const wx = this.cx * CHUNK_SIZE + lx;
				const wz = this.cz * CHUNK_SIZE + lz;
				const h  = terrainHeight(wx, wz);

				const idx = lz * CHUNK_SIZE + lx;
				this.heightMap[idx] = h;
				this.texMap[idx] = textureForHeight(h);
			}
		}

		this.spawnBats();
	}

	spawnBats() {
		const r = chunkRand(this.cx, this.cz, 0);

		let count = 0;
		if (r < 0.020) count = 1;
		if (r < 0.002) count = 2;

		for (let i = 0; i < count; i++) {
			const fx = chunkRand(this.cx, this.cz, i * 4 + 1);
			const fz = chunkRand(this.cx, this.cz, i * 4 + 2);
			const fy = chunkRand(this.cx, this.cz, i * 4 + 3);

			const bx = this.cx * CHUNK_SIZE + fx * CHUNK_SIZE;
			const bz = this.cz * CHUNK_SIZE + fz * CHUNK_SIZE;
			const groundH = terrainHeight(Math.floor(bx), Math.floor(bz));
			const by = groundH + 4 + fy * 18;

			this.bats.push(new Bat(bx, by, bz));
		}
	}

	buildFaces(world) {
		let buf = new Uint32Array(2048);
		let i = 0;

		for (let lz = 0; lz < CHUNK_SIZE; lz++) {
			const wzCenter = this.cz * CHUNK_SIZE + lz;

			for (let lx = 0; lx < CHUNK_SIZE; lx++) {
				const idx = lz * CHUNK_SIZE + lx;
				const h = this.heightMap[idx];
				if (h === 0) continue;

				const tex = this.texMap[idx];
				const wxCenter = this.cx * CHUNK_SIZE + lx;

				const hXminus = lx > 0
					? this.heightMap[idx - 1]
					: world.getHeight(wxCenter - 1, wzCenter);
				const hXplus = lx < CHUNK_SIZE - 1
					? this.heightMap[idx + 1]
					: world.getHeight(wxCenter + 1, wzCenter);
				const hZminus = lz > 0
					? this.heightMap[idx - CHUNK_SIZE]
					: world.getHeight(wxCenter, wzCenter - 1);
				const hZplus = lz < CHUNK_SIZE - 1
					? this.heightMap[idx + CHUNK_SIZE]
					: world.getHeight(wxCenter, wzCenter + 1);

				const colMax = 1 + 4 * h;
				if (i + colMax > buf.length) {
					const next = new Uint32Array(Math.max(buf.length * 2, i + colMax));
					next.set(buf);
					buf = next;
				}

				buf[i++] = packFace(this.slot, lx, lz, h - 1, 2, tex);

				if (h > hXplus)  { for (let y = hXplus;  y < h; y++) buf[i++] = packFace(this.slot, lx, lz, y, 0, tex); }
				if (h > hXminus) { for (let y = hXminus; y < h; y++) buf[i++] = packFace(this.slot, lx, lz, y, 1, tex); }
				if (h > hZplus)  { for (let y = hZplus;  y < h; y++) buf[i++] = packFace(this.slot, lx, lz, y, 4, tex); }
				if (h > hZminus) { for (let y = hZminus; y < h; y++) buf[i++] = packFace(this.slot, lx, lz, y, 5, tex); }
			}
		}

		if (i > SLOT_CAPACITY) {
			console.warn(`Chunk (${this.cx},${this.cz}) overflowed slot capacity: ${i} > ${SLOT_CAPACITY}`);
			i = SLOT_CAPACITY;
		}

		this.faces = buf.subarray(0, i);
	}
}


class World {
	constructor() {
		this.chunks = new Map();

		this.freeSlots = [];
		for (let i = MAX_SLOTS - 1; i >= 0; i--) this.freeSlots.push(i);

		this.faceBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.faceBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, MAX_SLOTS * SLOT_CAPACITY * 4, gl.DYNAMIC_DRAW);

		this.uploadBuf = new Uint32Array(SLOT_CAPACITY);
		this.zeroSlot  = new Uint32Array(SLOT_CAPACITY);

		this.chunkOriginTex = gl.createTexture();
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.chunkOriginTex);
		gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RG32I, 32, 32);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		this.chunkOriginData = new Int32Array(MAX_SLOTS * 2);
		this.chunkOriginDirty = false;

		this.loadQueue = [];
		this.queuedKeys = new Set();

		this.lastPlayerCx = NaN;
		this.lastPlayerCz = NaN;
	}

	updateChunks(camera) {
		const px = camera.eye.elements[0];
		const pz = camera.eye.elements[2];
		const pcx = Math.floor(px / CHUNK_SIZE);
		const pcz = Math.floor(pz / CHUNK_SIZE);

		if (pcx === this.lastPlayerCx && pcz === this.lastPlayerCz) return;

		this.lastPlayerCx = pcx;
		this.lastPlayerCz = pcz;

		const R = RENDER_DISTANCE;
		const desired = new Set();
		for (let dz = -R; dz <= R; dz++) {
			for (let dx = -R; dx <= R; dx++) {
				desired.add(`${pcx + dx},${pcz + dz}`);
			}
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, this.faceBuffer);

		for (const [key, chunk] of this.chunks) {
			if (desired.has(key)) continue;

			gl.bufferSubData(gl.ARRAY_BUFFER, chunk.slot * SLOT_CAPACITY * 4, this.zeroSlot);
			this.freeSlots.push(chunk.slot);
			this.chunks.delete(key);
		}

		for (const key of desired) {
			if (this.chunks.has(key)) continue;
			if (this.queuedKeys.has(key)) continue;

			this.loadQueue.push(key);
			this.queuedKeys.add(key);
		}
	}

	processLoadQueue() {
		if (this.loadQueue.length === 0) return;

		let processed = 0;

		while (processed < LOADS_PER_FRAME && this.loadQueue.length > 0) {
			const key = this.loadQueue.shift();
			this.queuedKeys.delete(key);

			const [cx, cz] = key.split(",").map(Number);

			if (this.chunks.has(key)) continue;
			if (Math.abs(cx - this.lastPlayerCx) > RENDER_DISTANCE) continue;
			if (Math.abs(cz - this.lastPlayerCz) > RENDER_DISTANCE) continue;

			const slot = this.freeSlots.pop();
			if (slot === undefined) {
				console.warn("Out of chunk slots — RENDER_DISTANCE too high?");
				return;
			}

			const chunk = new Chunk(cx, cz);
			chunk.slot = slot;
			chunk.generate();
			chunk.buildFaces(this);

			this.chunks.set(key, chunk);

			this.chunkOriginData[slot * 2]     = cx;
			this.chunkOriginData[slot * 2 + 1] = cz;
			this.chunkOriginDirty = true;

			this.uploadChunkSlot(chunk);

			processed++;
		}

		if (this.chunkOriginDirty) {
			this.uploadChunkOrigins();
			this.chunkOriginDirty = false;
		}
	}

	uploadChunkSlot(chunk) {
		this.uploadBuf.fill(0);
		this.uploadBuf.set(chunk.faces, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.faceBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, chunk.slot * SLOT_CAPACITY * 4, this.uploadBuf);
	}

	uploadChunkOrigins() {
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.chunkOriginTex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

		gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 32, 32,
			gl.RG_INTEGER, gl.INT, this.chunkOriginData);
	}

	inBounds(x, z) { return true; }

	getHeight(wx, wz) {
		const cx = Math.floor(wx / CHUNK_SIZE);
		const cz = Math.floor(wz / CHUNK_SIZE);

		const chunk = this.chunks.get(`${cx},${cz}`);
		if (chunk) {
			const lx = wx - cx * CHUNK_SIZE;
			const lz = wz - cz * CHUNK_SIZE;
			return chunk.heightMap[lz * CHUNK_SIZE + lx];
		}

		return terrainHeight(wx, wz);
	}

	addBlock(wx, wz, tex) {
		const cx = Math.floor(wx / CHUNK_SIZE);
		const cz = Math.floor(wz / CHUNK_SIZE);

		const chunk = this.chunks.get(`${cx},${cz}`);
		if (!chunk) return false;

		const lx = wx - cx * CHUNK_SIZE;
		const lz = wz - cz * CHUNK_SIZE;
		const idx = lz * CHUNK_SIZE + lx;

		if (chunk.heightMap[idx] >= MAX_HEIGHT) return false;

		chunk.heightMap[idx] += 1;
		chunk.texMap[idx] = tex;

		this.rebuildAround(chunk, lx, lz);
		return true;
	}

	deleteBlock(wx, wz) {
		const cx = Math.floor(wx / CHUNK_SIZE);
		const cz = Math.floor(wz / CHUNK_SIZE);

		const chunk = this.chunks.get(`${cx},${cz}`);
		if (!chunk) return false;

		const lx = wx - cx * CHUNK_SIZE;
		const lz = wz - cz * CHUNK_SIZE;
		const idx = lz * CHUNK_SIZE + lx;

		if (chunk.heightMap[idx] === 0) return false;

		chunk.heightMap[idx] -= 1;

		this.rebuildAround(chunk, lx, lz);
		return true;
	}

	rebuildAround(chunk, lx, lz) {
		chunk.buildFaces(this);
		this.uploadChunkSlot(chunk);

		if (lx === 0)              this.rebuildKey(`${chunk.cx - 1},${chunk.cz}`);
		if (lx === CHUNK_SIZE - 1) this.rebuildKey(`${chunk.cx + 1},${chunk.cz}`);
		if (lz === 0)              this.rebuildKey(`${chunk.cx},${chunk.cz - 1}`);
		if (lz === CHUNK_SIZE - 1) this.rebuildKey(`${chunk.cx},${chunk.cz + 1}`);
	}

	rebuildKey(key) {
		const c = this.chunks.get(key);
		if (!c) return;

		c.buildFaces(this);
		this.uploadChunkSlot(c);
	}

	render(time) {
		// Sky
		gl.useProgram(mesh.program);
		gl.depthMask(false);

		const sky = new Matrix4();
		sky.translate(camera.eye.elements[0], camera.eye.elements[1], camera.eye.elements[2]);
		sky.scale(3000, 3000, 3000);
		sky.translate(-0.5, -0.5, -0.5);

		drawCube(sky, COLOR_SKY, 0.0, 0);

		gl.depthMask(true);

		// Terrain — one draw call for the whole streamed world
		gl.useProgram(voxel.program);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.faceBuffer);
		gl.vertexAttribIPointer(voxel.a_FaceData, 1, gl.UNSIGNED_INT, 0, 0);
		gl.enableVertexAttribArray(voxel.a_FaceData);
		gl.vertexAttribDivisor(voxel.a_FaceData, 1);

		gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, MAX_SLOTS * SLOT_CAPACITY);

		gl.disable(gl.CULL_FACE);

		// Bats
		gl.useProgram(mesh.program);

		for (const chunk of this.chunks.values()) {
			for (const bat of chunk.bats) bat.render(time);
		}
	}
}
