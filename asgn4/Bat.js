var COLOR_BODY_DARK = [0.25, 0.18, 0.30, 1.0];
var COLOR_BODY_MID  = [0.40, 0.30, 0.45, 1.0];
var COLOR_WING_DARK = [0.18, 0.12, 0.22, 1.0];
var COLOR_WING_MID  = [0.30, 0.22, 0.36, 1.0];
var COLOR_EAR  = [0.55, 0.32, 0.40, 1.0];
var COLOR_EYE  = [1.0, 0.25, 0.25, 1.0];
var COLOR_FANG = [0.95, 0.95, 0.85, 1.0];
var COLOR_FOOT = [0.30, 0.20, 0.25, 1.0];


function batCube(m, color) { drawCube(m, color, 0.0, 0); }
function batCyl(m, color)  { drawCylinder(m, color, 0.0, 0); }


function batBox(parentM, cx, cy, cz, sx, sy, sz, color) {
	const M = new Matrix4(parentM);
	M.translate(cx - sx / 2, cy - sy / 2, cz - sz / 2);
	M.scale(sx, sy, sz);

	batCube(M, color);
}


class Bat {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;

		this.heading = Math.random() * Math.PI * 2;
		this.targetHeading = this.heading;
		this.targetY = y;
		this.bankRoll = 0;

		this.speed = 0.8 + Math.random() * 1.6;
		this.turnRate = 0.35 + Math.random() * 0.45;
		this.climbRate = 0.6 + Math.random() * 0.8;

		this.flapFreq = 4.5 + Math.random() * 2.0;
		this.flapPhase = Math.random() * Math.PI * 2;
		this.flapAmp = 0.25 + Math.random() * 0.20;

		this.scale = 1.1 + Math.random() * 0.5;

		this.lastTime = -1;
		this.nextTurn = 0;
		this.nextAltGoal = 0;
	}

	update(time) {
		if (this.lastTime < 0) {
			this.lastTime = time;
			this.nextTurn = time + 2 + Math.random() * 4;
			this.nextAltGoal = time + 3 + Math.random() * 5;
			return;
		}

		const dt = Math.min(time - this.lastTime, 0.1);
		this.lastTime = time;

		if (time > this.nextTurn) {
			this.targetHeading = this.heading + (Math.random() - 0.5) * Math.PI * 1.4;
			this.nextTurn = time + 4 + Math.random() * 8;
		}

		const rawDelta = Math.atan2(
			Math.sin(this.targetHeading - this.heading),
			Math.cos(this.targetHeading - this.heading)
		);
		const maxTurn = this.turnRate * dt;
		const yaw = Math.max(-maxTurn, Math.min(maxTurn, rawDelta));

		this.heading += yaw;

		const targetBank = -(yaw / dt) / this.turnRate * 25;
		this.bankRoll += (targetBank - this.bankRoll) * Math.min(1, 4 * dt);

		const groundH = terrainHeight(Math.floor(this.x), Math.floor(this.z));

		if (time > this.nextAltGoal) {
			this.targetY = groundH + 6 + Math.random() * 20;
			this.nextAltGoal = time + 5 + Math.random() * 8;
		}
		if (this.targetY < groundH + 5) this.targetY = groundH + 5;

		const dy = this.targetY - this.y;
		const climb = Math.max(-this.climbRate * dt, Math.min(this.climbRate * dt, dy));

		this.y += climb;
		this.x += Math.cos(this.heading) * this.speed * dt;
		this.z += Math.sin(this.heading) * this.speed * dt;

		if (this.y < groundH + 3) this.y = groundH + 3;
		if (this.y > MAX_HEIGHT + 30) this.y = MAX_HEIGHT + 30;
	}

	render(time) {
		this.update(time);

		const theta = time * this.flapFreq + this.flapPhase;
		const lift = -Math.sin(theta) * this.flapAmp;

		const a = {
			shoulder: Math.sin(theta) * 45,
			forearm:  30 + Math.sin(theta + 0.6) * 30,
			tip:      20 + Math.sin(theta + 1.2) * 25,
			head:     Math.sin(time * 2.5) * 12,
			bodyBob:  lift,
			earL:     Math.sin(time * 3) * 15,
			earR:    -Math.sin(time * 3) * 15,
			tailWag:  Math.sin(time * 4) * 25,
			bodyTilt: Math.sin(time * 2.5) * 4,
		};

		const headingDeg = -90 - this.heading * 180 / Math.PI;

		const root = new Matrix4();
		root.translate(this.x, this.y, this.z);
		root.rotate(headingDeg, 0, 1, 0);
		root.scale(this.scale, this.scale, this.scale);
		root.translate(0, a.bodyBob, 0);
		root.rotate(a.bodyTilt + this.bankRoll, 0, 0, 1);

		batBox(root, 0,  0.00,  0.00, 0.60, 0.45, 0.45, COLOR_BODY_DARK);
		batBox(root, 0, -0.02, -0.18, 0.35, 0.30, 0.12, COLOR_BODY_MID);

		// Head
		const headM = new Matrix4(root);
		headM.translate(0, 0.20, -0.10);
		headM.rotate(a.head, 1, 0, 0);

		batBox(headM,  0.00,  0.10, -0.05, 0.40, 0.35, 0.40, COLOR_BODY_DARK);
		batBox(headM,  0.00,  0.04, -0.27, 0.20, 0.16, 0.15, COLOR_BODY_MID);
		batBox(headM, -0.10,  0.16, -0.28, 0.06, 0.06, 0.04, COLOR_EYE);
		batBox(headM,  0.10,  0.16, -0.28, 0.06, 0.06, 0.04, COLOR_EYE);
		batBox(headM, -0.04, -0.07, -0.30, 0.03, 0.08, 0.03, COLOR_FANG);
		batBox(headM,  0.04, -0.07, -0.30, 0.03, 0.08, 0.03, COLOR_FANG);

		// Ears
		const earL = new Matrix4(headM);
		earL.translate(-0.13, 0.27, -0.02);
		earL.rotate(a.earL, 0, 0, 1);

		batBox(earL, 0, 0.08, 0, 0.10, 0.20, 0.08, COLOR_EAR);

		const earR = new Matrix4(headM);
		earR.translate(0.13, 0.27, -0.02);
		earR.rotate(-a.earR, 0, 0, 1);

		batBox(earR, 0, 0.08, 0, 0.10, 0.20, 0.08, COLOR_EAR);

		// Right wing
		const rShoulder = new Matrix4(root);
		rShoulder.translate(0.30, 0.10, 0);
		rShoulder.rotate(a.shoulder, 0, 0, 1);
		rShoulder.rotate(20, 0, 1, 0);

		batBox(rShoulder, 0.275, 0, 0, 0.55, 0.04, 0.35, COLOR_WING_DARK);

		const rForearm = new Matrix4(rShoulder);
		rForearm.translate(0.55, 0, 0);
		rForearm.rotate(-a.forearm, 0, 0, 1);

		batBox(rForearm, 0.25, 0, 0.05, 0.50, 0.04, 0.40, COLOR_WING_MID);

		const rTip = new Matrix4(rForearm);
		rTip.translate(0.50, 0, 0);
		rTip.rotate(-a.tip, 0, 0, 1);

		batBox(rTip, 0.18, 0.000, 0.10, 0.36, 0.04, 0.30, COLOR_WING_DARK);
		batBox(rTip, 0.18, 0.045, 0.10, 0.36, 0.03, 0.03, COLOR_BODY_MID);

		// Left wing
		const lShoulder = new Matrix4(root);
		lShoulder.translate(-0.30, 0.10, 0);
		lShoulder.rotate(-a.shoulder, 0, 0, 1);
		lShoulder.rotate(-20, 0, 1, 0);

		batBox(lShoulder, -0.275, 0, 0, 0.55, 0.04, 0.35, COLOR_WING_DARK);

		const lForearm = new Matrix4(lShoulder);
		lForearm.translate(-0.55, 0, 0);
		lForearm.rotate(a.forearm, 0, 0, 1);

		batBox(lForearm, -0.25, 0, 0.05, 0.50, 0.04, 0.40, COLOR_WING_MID);

		const lTip = new Matrix4(lForearm);
		lTip.translate(-0.50, 0, 0);
		lTip.rotate(a.tip, 0, 0, 1);

		batBox(lTip, -0.18, 0.000, 0.10, 0.36, 0.04, 0.30, COLOR_WING_DARK);
		batBox(lTip, -0.18, 0.045, 0.10, 0.36, 0.03, 0.03, COLOR_BODY_MID);

		// Tail
		const tailM = new Matrix4(root);
		tailM.translate(0, -0.10, 0.20);
		tailM.rotate(a.tailWag, 0, 1, 0);

		batBox(tailM, 0, 0, 0.10, 0.08, 0.08, 0.20, COLOR_BODY_MID);

		// Feet
		const lFoot = new Matrix4(root);
		lFoot.translate(-0.10, -0.42, 0.05);
		lFoot.scale(0.10, 0.22, 0.10);

		batCyl(lFoot, COLOR_FOOT);

		const rFoot = new Matrix4(root);
		rFoot.translate(0.10, -0.42, 0.05);
		rFoot.scale(0.10, 0.22, 0.10);

		batCyl(rFoot, COLOR_FOOT);
	}
}
