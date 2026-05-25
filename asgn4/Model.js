class Model {
	constructor(url) {
		this.ready = false;
		fetch(url)
			.then((res) => res.ok ? res.text() : Promise.reject(`OBJ fetch failed: ${url}`))
			.then((text) => this.parse(text))
			.catch((err) => console.warn("Model load failed:", err));
	}

	parse(text) {
		const verts = [], uvs = [], norms = [];
		const outPos = [], outUV = [], outNorm = [], vertIdx = [];
		let haveNormals = false;

		for (const raw of text.split(/\r?\n/)) {
			const parts = raw.trim().split(/\s+/);
			const tag = parts[0];
			if (tag === "v")  verts.push(+parts[1], +parts[2], +parts[3]);
			else if (tag === "vt") uvs.push(+parts[1], +parts[2]);
			else if (tag === "vn") { norms.push(+parts[1], +parts[2], +parts[3]); haveNormals = true; }
			else if (tag === "f") {
				const face = parts.slice(1).map((tok) => tok.split("/").map((s) => parseInt(s, 10) || 0));
				for (let i = 1; i < face.length - 1; i++) {
					for (const [v, vt, vn] of [face[0], face[i], face[i + 1]]) {
						const vi = v > 0 ? v - 1 : verts.length / 3 + v;
						outPos.push(verts[vi*3], verts[vi*3+1], verts[vi*3+2]);
						vertIdx.push(vi);

						const ti = vt > 0 ? vt - 1 : uvs.length / 2 + vt;
						outUV.push(uvs[ti*2] || 0, uvs[ti*2+1] || 0);

						const ni = vn > 0 ? vn - 1 : norms.length / 3 + vn;
						outNorm.push(norms[ni*3] || 0, norms[ni*3+1] || 0, norms[ni*3+2] || 0);
					}
				}
			}
		}

		if (!haveNormals) {
			const accum = new Float32Array(verts.length);
			for (let i = 0; i < outPos.length; i += 9) {
				const [ax, ay, az] = outPos.slice(i, i + 3);
				const [bx, by, bz] = outPos.slice(i + 3, i + 6);
				const [cx, cy, cz] = outPos.slice(i + 6, i + 9);
				const ex1 = bx-ax, ey1 = by-ay, ez1 = bz-az;
				const ex2 = cx-ax, ey2 = cy-ay, ez2 = cz-az;
				const nx = ey1*ez2 - ez1*ey2, ny = ez1*ex2 - ex1*ez2, nz = ex1*ey2 - ey1*ex2;
				for (let k = 0; k < 3; k++) {
					const vi = vertIdx[i/3 + k];
					accum[vi*3] += nx; accum[vi*3+1] += ny; accum[vi*3+2] += nz;
				}
			}
			for (let i = 0; i < accum.length; i += 3) {
				const len = Math.hypot(accum[i], accum[i+1], accum[i+2]) || 1;
				accum[i] /= len; accum[i+1] /= len; accum[i+2] /= len;
			}
			for (let i = 0; i < vertIdx.length; i++) {
				const vi = vertIdx[i];
				outNorm[i*3] = accum[vi*3]; outNorm[i*3+1] = accum[vi*3+1]; outNorm[i*3+2] = accum[vi*3+2];
			}
		}

		this.positionBuffer = makeStaticBuffer(outPos);
		this.normalBuffer   = makeStaticBuffer(outNorm);
		this.uvBuffer       = makeStaticBuffer(outUV);
		this.vertexCount    = outPos.length / 3;
		this.ready = true;
	}

	draw(matrix, color) {
		if (!this.ready) return;

		gl.uniformMatrix4fv(mesh.u_ModelMatrix, false, matrix.elements);
		setNormalMatrix(matrix);
		gl.uniform4fv(mesh.u_BaseColor, color);
		gl.uniform1f(mesh.u_TexColorWeight, 0.0);
		gl.uniform1i(mesh.u_TexIndex, 0);
		gl.uniform1i(mesh.u_Emissive, 0);

		bindAttrib(this.positionBuffer, mesh.a_Position, 3);
		bindAttrib(this.normalBuffer,   mesh.a_Normal,   3);
		bindAttrib(this.uvBuffer,       mesh.a_UV,       2);

		gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
	}
}
