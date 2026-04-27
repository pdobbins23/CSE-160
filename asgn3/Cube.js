class Cube {
	static positionBuffer = null;
	static uvBuffer = null;
	static vertexCount = 0;

	static buildBuffers(gl) {
		if (Cube.positionBuffer) return;

		const positions = [];
		const uvs = [];

		const pushFace = (a, b, c, d) => {
			positions.push(...a, ...b, ...c, ...a, ...c, ...d);
			uvs.push(0, 0,  1, 0,  1, 1,  0, 0,  1, 1,  0, 1);
		};

		pushFace([0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]);
		pushFace([1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]);
		pushFace([0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]);
		pushFace([0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]);
		pushFace([1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]);
		pushFace([0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]);

		Cube.positionBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Cube.positionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		Cube.uvBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uvBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

		Cube.vertexCount = positions.length / 3;
	}
}


function drawCube(matrix, baseColor, texColorWeight, texIndex) {
	Cube.buildBuffers(gl);

	gl.uniformMatrix4fv(mesh.u_ModelMatrix, false, matrix.elements);
	gl.uniform4f(mesh.u_BaseColor, baseColor[0], baseColor[1], baseColor[2], baseColor[3]);
	gl.uniform1f(mesh.u_TexColorWeight, texColorWeight);
	gl.uniform1i(mesh.u_TexIndex, texIndex);

	gl.bindBuffer(gl.ARRAY_BUFFER, Cube.positionBuffer);
	gl.vertexAttribPointer(mesh.a_Position, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(mesh.a_Position);

	gl.bindBuffer(gl.ARRAY_BUFFER, Cube.uvBuffer);
	gl.vertexAttribPointer(mesh.a_UV, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(mesh.a_UV);

	gl.drawArrays(gl.TRIANGLES, 0, Cube.vertexCount);
}
