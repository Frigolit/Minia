//! Minia - http://frigolit.net/projects/minia
//! Copyright (C) 2013 Pontus "Frigolit" Rodling
//!
//! Licensed under the MIT license - See LICENSE for more information

window.Minia.Splash = new (function() {
	var self = this;
	
	self.name = "Splash";
	
	var main;
	var ctx;
	
	var img_logo;
	var spr_player;
	var img_spike;
	
	var logo_state = 0;
	var player_dead = 0;
	var counter = 0;
	var fadeout = 0;
	var fadeout_counter;
	
	var plr_x;
	var spike_y;
	var spike_yvel;
	
	var particles;
	
	var cv_base;
	var ctx_base;
	
	// main.start_controller(window.Minia.Menu);
	
	self.start = function(_main, _ctx) {
		main = _main;
		ctx = _ctx;
		
		// Reset variables
		logo_state = 0;
		player_dead = 0;
		counter = 0;
		fadeout = 0;
		fadeout_counter = 15;
		
		plr_x = -24;
		spike_y = -504;
		spike_yvel = 8.0;
		
		particles = [];
		
		// Create surfaces
		cv_base = document.createElement("canvas");
		ctx_base = cv_base.getContext("2d");
		
		cv_base.width = 320;
		cv_base.height = 240;
		
		main.disable_canvas_smoothing(ctx_base);
		
		// Get resources
		img_logo = Minia.Resources.resmap.splash.ref;
		img_spike = Minia.Resources.tilemap["spikes"];
		spr_player = Minia.Resources.sprites["player_walk_right"];
	};
	
	self.frame = function() {
		ctx_base.fillStyle = "#354b38";
		ctx_base.globalAlpha = 1.0;
		ctx_base.fillRect(0, 0, 320, 240);
		
		// Logo
		if (logo_state == 0) {
			ctx_base.globalAlpha = counter / 30;
			ctx_base.drawImage(img_logo, 160 - img_logo.width / 2, 120 - img_logo.height / 2);
			ctx_base.globalAlpha = 1.0;
			
			if (counter < 30) counter++;
			else {
				counter = 0;
				logo_state = 1;
			}
		}
		else ctx_base.drawImage(img_logo, 160 - img_logo.width / 2, 120 - img_logo.height / 2);
		
		// Player
		if (plr_x < 132) {
			ctx_base.drawImage(spr_player.frame, 0, 0, 8, 8, plr_x, 120, 16, 16);
			plr_x += 2;
		}
		else if (!player_dead) {
			player_dead = 1;
			
			for (var y = 0; y < 16; y++) {
				for (var x = 0; x < 16; x++) {
					spawn_particle(134 + x, 120 + y, Math.random() * (Math.PI * 2), Math.random() * 5, [Math.round(128 + Math.random() * 128), 0, 0]);
					spawn_particle(134 + x, 120 + y, Math.random() * (Math.PI * 2), Math.random(), [128, Math.round(128 + Math.random() * 128), 128]);
				}
			}
		}
		else if (counter < 80) {
			counter++;
		}
		else if (!fadeout) fadeout = 1;
		
		// Particles
		for (var i = 0, j = particles.length; i < j; i++) {
			var p = particles[i];
			
			var nx = p.x + p.x_velocity;
			var ny = p.y + p.y_velocity;
			
			var tx = Math.floor(p.x / 8);
			var ty = Math.floor(p.y / 8);
			
			var tnx = Math.floor(nx / 8);
			var tny = Math.floor(ny / 8);
			
			p.y_velocity += 0.1;
			
			if (p.y >= 134) {
				if (Math.abs(p.y_velocity) < 1) {
					p.y_velocity = 0;
					p.x_velocity = 0;
				}
				else {
					p.y_velocity = -p.y_velocity / 4;
					p.x_velocity /= 2;
				}
				
				nx = p.x + p.x_velocity;
				ny = p.y + p.y_velocity;
			}
			
			p.x = nx;
			p.y = ny;
			
			ctx_base.fillStyle = "rgb(" + p.color[0] + "," + p.color[1] + "," + p.color[2] + ")";
			ctx_base.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
		}
		
		// Spike
		ctx_base.drawImage(img_spike, 0, 0, 8, 8, 132, spike_y, 16, 16);
		spike_y = Math.round(spike_y + spike_yvel);
		
		if (spike_y >= 120) spike_yvel = -Math.floor(spike_yvel / 1.2);
		
		if (spike_yvel < 8 && spike_y < 120) spike_yvel += 0.5;
		
		// Render to screen
		if (fadeout) {
			ctx.globalAlpha = 1.0;
			ctx.fillStyle = "#000";
			ctx.fillRect(0, 0, 320, 240);
			
			ctx.globalAlpha = fadeout_counter / 15;
			ctx.drawImage(cv_base, 0, 0);
			
			if (fadeout_counter > 0) fadeout_counter--;
			else {
				main.start_controller(undefined);
				setTimeout(function() { main.start_controller(window.Minia.Menu); }, 1000);
			}
		}
		else ctx.drawImage(cv_base, 0, 0);
	};
	
	self.stop = function() { };
	
	self.input_key_down = function(e) {
		var k = e.keyCode;
		
		if (!fadeout && (k == 13 || k == 32 || k == 90)) {
			fadeout = 1;
		}
	};
	
	function spawn_particle(x, y, angle, velocity, color) {
		var p = {
			"x": x,
			"y": y,
			"x_velocity": Math.cos(angle) * velocity,
			"y_velocity": Math.sin(angle) * velocity,
			"velocity": velocity,
			"color": color,
		};
		
		particles.push(p);
	}
});

