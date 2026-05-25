class Cylinder {
	static positionBuffer = null;
	static normalBuffer = null;
	static uvBuffer = null;
	static vertexCount = 0;
	static segments = 16;

	static buildBuffers(gl) {
		if (Cylinder.positionBuffer) return;

		const positions = [];
		const normals = [];
		const uvs = [];
		const N = Cylinder.segments;
		const r = 0.5;

		for (let i = 0; i < N; i++) {
			const a0 = (i / N) * Math.PI * 2;
			const a1 = ((i + 1) / N) * Math.PI * 2;
			const c0 = Math.cos(a0), s0 = Math.sin(a0);
			const c1 = Math.cos(a1), s1 = Math.sin(a1);
			const x0 = c0 * r, z0 = s0 * r;
			const x1 = c1 * r, z1 = s1 * r;
			const u0 = i / N, u1 = (i + 1) / N;

			positions.push(x0, 0, z0, x1, 0, z1, x1, 1, z1,
			               x0, 0, z0, x1, 1, z1, x0, 1, z0);
			normals.push(c0, 0, s0,  c1, 0, s1,  c1, 0, s1,
			             c0, 0, s0,  c1, 0, s1,  c0, 0, s0);
			uvs.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);

			positions.push(0, 1, 0, x0, 1, z0, x1, 1, z1);
			normals.push(0, 1, 0,  0, 1, 0,  0, 1, 0);
			uvs.push(0.5, 0.5, 0.5 + x0, 0.5 + z0, 0.5 + x1, 0.5 + z1);

			positions.push(0, 0, 0, x1, 0, z1, x0, 0, z0);
			normals.push(0, -1, 0,  0, -1, 0,  0, -1, 0);
			uvs.push(0.5, 0.5, 0.5 + x1, 0.5 + z1, 0.5 + x0, 0.5 + z0);
		}

		Cylinder.positionBuffer = makeStaticBuffer(positions);
		Cylinder.normalBuffer   = makeStaticBuffer(normals);
		Cylinder.uvBuffer       = makeStaticBuffer(uvs);
		Cylinder.vertexCount    = positions.length / 3;
	}
}


function drawCylinder(matrix, baseColor, texColorWeight, texIndex) {
	Cylinder.buildBuffers(gl);

	gl.uniformMatrix4fv(mesh.u_ModelMatrix, false, matrix.elements);
	setNormalMatrix(matrix);
	gl.uniform4fv(mesh.u_BaseColor, baseColor);
	gl.uniform1f(mesh.u_TexColorWeight, texColorWeight);
	gl.uniform1i(mesh.u_TexIndex, texIndex);

	bindAttrib(Cylinder.positionBuffer, mesh.a_Position, 3);
	bindAttrib(Cylinder.normalBuffer,   mesh.a_Normal,   3);
	bindAttrib(Cylinder.uvBuffer,       mesh.a_UV,       2);

	gl.drawArrays(gl.TRIANGLES, 0, Cylinder.vertexCount);
}
