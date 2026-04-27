class Cylinder {
	static positionBuffer = null;
	static uvBuffer = null;
	static vertexCount = 0;
	static segments = 16;

	static buildBuffers(gl) {
		if (Cylinder.positionBuffer) return;

		const positions = [];
		const uvs = [];
		const N = Cylinder.segments;
		const r = 0.5;

		for (let i = 0; i < N; i++) {
			const a0 = (i / N) * Math.PI * 2;
			const a1 = ((i + 1) / N) * Math.PI * 2;

			const x0 = Math.cos(a0) * r;
			const z0 = Math.sin(a0) * r;
			const x1 = Math.cos(a1) * r;
			const z1 = Math.sin(a1) * r;

			positions.push(x0, 0, z0, x1, 0, z1, x1, 1, z1);
			positions.push(x0, 0, z0, x1, 1, z1, x0, 1, z0);

			const u0 = i / N;
			const u1 = (i + 1) / N;
			uvs.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);

			positions.push(0, 1, 0, x0, 1, z0, x1, 1, z1);
			uvs.push(0.5, 0.5, 0.5 + x0, 0.5 + z0, 0.5 + x1, 0.5 + z1);

			positions.push(0, 0, 0, x1, 0, z1, x0, 0, z0);
			uvs.push(0.5, 0.5, 0.5 + x1, 0.5 + z1, 0.5 + x0, 0.5 + z0);
		}

		Cylinder.positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Cylinder.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		Cylinder.uvBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Cylinder.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

		Cylinder.vertexCount = positions.length / 3;
	}
}


function drawCylinder(matrix, baseColor, texColorWeight, texIndex) {
	Cylinder.buildBuffers(gl);

	gl.uniformMatrix4fv(mesh.u_ModelMatrix, false, matrix.elements);
	gl.uniform4f(mesh.u_BaseColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);
	gl.uniform1f(mesh.u_TexColorWeight, texColorWeight);
	gl.uniform1i(mesh.u_TexIndex, texIndex);

	gl.bindBuffer(gl.ARRAY_BUFFER, Cylinder.positionBuffer);
	gl.vertexAttribPointer(mesh.a_Position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(mesh.a_Position);

	gl.bindBuffer(gl.ARRAY_BUFFER, Cylinder.uvBuffer);
	gl.vertexAttribPointer(mesh.a_UV, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(mesh.a_UV);

	gl.drawArrays(gl.TRIANGLES, 0, Cylinder.vertexCount);
}
