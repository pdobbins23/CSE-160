class Sphere {
	static positionBuffer = null;
	static normalBuffer = null;
	static uvBuffer = null;
	static indexBuffer = null;
	static indexCount = 0;

	static buildBuffers(gl, latBands = 24, lonBands = 32) {
		if (Sphere.positionBuffer) return;

		const positions = [];
		const uvs = [];
		const indices = [];

		for (let lat = 0; lat <= latBands; lat++) {
			const theta = lat * Math.PI / latBands;
			const sinT = Math.sin(theta), cosT = Math.cos(theta);
			for (let lon = 0; lon <= lonBands; lon++) {
				const phi = lon * 2 * Math.PI / lonBands;
				positions.push(Math.cos(phi) * sinT, cosT, Math.sin(phi) * sinT);
				uvs.push(1 - lon / lonBands, 1 - lat / latBands);
			}
		}

		for (let lat = 0; lat < latBands; lat++) {
			for (let lon = 0; lon < lonBands; lon++) {
				const a = lat * (lonBands + 1) + lon;
				const b = a + lonBands + 1;
				indices.push(a, b, a + 1,  b, b + 1, a + 1);
			}
		}

		Sphere.positionBuffer = makeStaticBuffer(positions);
		Sphere.normalBuffer   = makeStaticBuffer(positions);
		Sphere.uvBuffer       = makeStaticBuffer(uvs);

		Sphere.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Sphere.indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

		Sphere.indexCount = indices.length;
	}
}


function drawSphere(matrix, color) {
	Sphere.buildBuffers(gl);

	gl.uniformMatrix4fv(mesh.u_ModelMatrix, false, matrix.elements);
	setNormalMatrix(matrix);
	gl.uniform4fv(mesh.u_BaseColor, color);
	gl.uniform1f(mesh.u_TexColorWeight, 0.0);
	gl.uniform1i(mesh.u_TexIndex, 0);
	gl.uniform1i(mesh.u_Emissive, 0);

	bindAttrib(Sphere.positionBuffer, mesh.a_Position, 3);
	bindAttrib(Sphere.normalBuffer,   mesh.a_Normal,   3);
	bindAttrib(Sphere.uvBuffer,       mesh.a_UV,       2);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Sphere.indexBuffer);
	gl.drawElements(gl.TRIANGLES, Sphere.indexCount, gl.UNSIGNED_SHORT, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
}
