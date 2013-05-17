/******************************************************************************

Ludum Dare 26 - 48h gamedev compo entry by Frigolit (http://frigolit.net)
Visit http://www.ludumdare.com/ for more information on Ludum Dare.

*******************************************************************************

Copyright (C) 2013 Pontus "Frigolit" Rodling

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*****************************************************************************/

$(function() {
	// Settings
	var base_url = "game";
	var debug_mode = false;
	
	// ARE YOU INSANE?!
	function compatfail() {
		$("#fail").html("<img src=\"game/gfx/fission-mailed.png\" /><br/>Oops! Your browser doesn't seem to support HTML5 canvas! Please use Mozilla Firefox or Google Chrome instead.");
	}
	
	try {
		if (!document.createElement("canvas").getContext || !document.createElement("canvas").getContext("2d").fillText) {
			compatfail();
			return;
		}
	}
	catch (e) {
		compatfail();
		return;
	}
	
	// Blah
	var el_content = $("#content");
	
	var screen_e = $("<canvas>");
	var screen = screen_e[0];
	var screen_ctx = screen.getContext("2d");
	
	screen.width = 320;
	screen.height = 240;
	
	$(document)
		.keydown(input_key_down)
		.keyup(input_key_up);
	
	var cv_root = document.createElement("canvas");
	var ctx_root = cv_root.getContext("2d");
	
	cv_root.width = 320;
	cv_root.height = 240;
	
	var cv_level = document.createElement("canvas");
	var ctx_level = cv_level.getContext("2d");
	
	// Resources
	var resources = [
		{ "name": "sprites",  "file": "/gfx/sprites.png", "type": "gfx" },
		{ "name": "tiles",    "file": "/gfx/tiles.png",   "type": "gfx" },
		{ "name": "bg",       "file": "/gfx/bg.png",      "type": "gfx" },
		{ "name": "bg2",      "file": "/gfx/bg2.png",     "type": "gfx" },
		{ "name": "bg3",      "file": "/gfx/bg3.png",     "type": "gfx" }
	];
	
	var resmap = {};
	
	var sprites;
	var tiles;
	
	var tiledata = [
		0x00,	// Air
		0x01,	// Wall
		0x01,	// Ice (?)
		0x02,	// Spikes
		0x00,	// Tiled wall
		0x00,	// Tiled wall (broken)
		0x00,	// Exit
		0x00,	// Checkpoint (converted to entity)
		0x00,	// Warning sign
		0x01,	// Crate
		0x02,	// Spikes + bg
	];
	
	var tile_explode_colormap = [
		[],
		[ [ 200, 200, 200 ], [ 255, 255, 255 ] ],	// Wall
		[ [   8,  82, 181 ], [  25, 130, 224 ] ],	// Ice
		[ [ 200, 200, 200 ], [ 255, 255, 255 ] ],	// Spike
		[ [  74, 105, 133 ], [ 102, 144, 170 ] ],	// Bg tile
		[ [  74, 105, 133 ], [ 102, 144, 170 ] ],	// Bg tile (broken)
		[ [ 255, 128,   0 ], [ 255, 200,   0 ] ],	// Exit
		[],	// Checkpoint (doesn't exist)
		[ [  74, 105, 133 ], [ 102, 144, 170 ] ],	// Warning sign
		[ [ 133,  91,  44 ], [ 187, 148,  71 ] ],	// Crate
		[ [ 200, 200, 200 ], [ 255, 255, 255 ] ],	// Spike + bg
		[ [ 200, 200, 200 ], [ 255, 255, 255 ] ],	// Pillar
		[ [ 133,  91,  44 ], [ 187, 148,  71 ] ],	// Pillar
	];
	
	var animsprites;
	
	// Level
	var level;
	var player;
	
	// Camera stuff
	var camera_shake = 0;
	var camera_shake_decrement = 1;
	
	// Misc
	var fps = 0, fpsc = 0;
	var think_step = 0;
	var debug_info = false;
	
	// Canvas resize function
	function resize() {
		var cw = el_content.width();
		var ch = el_content.height();
		var ca = cw / ch;
		
		var ta = cv_root.width / cv_root.height;
		
		if (ca > ta) {
			screen_e.css({
				"width": ch * ta,
				"height": ch,
			});
		}
		else {
			screen_e.css({
				"width": cw,
				"height": cw / ta,
			});
		}
	}
	
	function load_level(n, cb) {
		screen_ctx.fillStyle = "#fff";
		screen_ctx.font = "bold 12px sans";
		screen_ctx.textBaseline = "middle";
		screen_ctx.textAlign = "center";
		
		screen_ctx.clearRect(0, 0, screen.width, screen.height);
		screen_ctx.fillText("Loading level...", screen.width / 2, screen.height / 2);
		
		$.get(
			base_url + "/levels/" + n + ".json",
			function(data) {
				level = data;
				
				level.tiles_orig = level.tiles;
				level.tiles = undefined;
				
				level.background_ref = (resmap[level.background] || resmap.bg).ref;
				
				if (!level.exits) level.exits = {};
				
				cv_level.width = level.width * 8;
				cv_level.height = level.height * 8;
				
				console.log("Loaded level: " + level.title);
				cb();
			});
	}
	
	// Load resources
	function load_resources(cb) {
		for (var i = 0; i < resources.length; i++) {
			if (!resources[i].ref) {
				var res = resources[i];
				var url = base_url + res.file;
				
				screen_ctx.clearRect(0, 0, screen.width, screen.height);
				screen_ctx.fillText("Loading " + res.name + " (" + url + ")...", screen.width / 2, screen.height / 2);
				
				console.log("Loading " + res.name + " (" + url + ")...");
				
				if (res.type == "gfx") {
					var img = new Image();
					img.onload = function() {
						res.ref = img;
						resmap[res.name] = res;
						load_resources(cb);
					};
					
					img.src = url;
				}
				else if (res.type == "json") {
					$.get(
						url,
						function(data) {
							res.ref = data;
							resmap[res.name] = res;
							load_resources(cb);
						});
				}
				
				return;
			}
		}
		
		console.log("Resources loaded!");
		cb();
	}
	
	// Init
	$(window).resize(resize);
	el_content.html(screen_e);
	resize();
	
	screen_ctx.fillStyle = "#fff";
	screen_ctx.font = "bold 12px sans";
	screen_ctx.textBaseline = "middle";
	screen_ctx.textAlign = "center";
	
	load_resources(function() {
		process_resources();
		start_game();
	});
	
	function process_resources() {
		screen_ctx.clearRect(0, 0, screen.width, screen.height);
		screen_ctx.fillText("Initializing resources...", screen.width / 2, screen.height / 2);
		
		console.log("Initializing resources...");
		process_tiles();
		process_sprites();
	}
	
	function process_tiles() {
		var res = resmap["tiles"];
		tiles = [];
		for (var i = 0; i < 256; i++) {
			var x = (i % 16) * 8;
			var y = Math.floor(i / 16) * 8;
			
			var c = document.createElement("canvas");
			c.width = 8;
			c.height = 8;
			c.getContext("2d").drawImage(res.ref, x, y, 8, 8, 0, 0, 8, 8);
			
			tiles.push(c);
		}
	}
	
	function process_sprites() {
		animsprites = [];
		
		function get_frame(x, y) {
			var c = document.createElement("canvas");
			c.width = 8;
			c.height = 8;
			c.getContext("2d").drawImage(resmap.sprites.ref, x * 8, y * 8, 8, 8, 0, 0, 8, 8);
			return c;
		}
		
		function create_static_sprite(x, y) {
			return {
				"type": "static",
				"frame": get_frame(x, y)
			};
		}
		
		function create_anim_sprite(x, y, frames, interval) {
			var f = [];
			for (var i = 0; i < frames; i++) {
				f.push(get_frame(x + i, y));
			}
			
			var r = {
				"type":     "anim", 
				"counter":  0,
				"interval": interval,
				"time":     0,
				"frame":    f[0],
				"frames":   f
			};
			
			animsprites.push(r);
			
			return r;
		}
		
		sprites = {
			"player_idle_right":   create_static_sprite(0, 0),
			"player_walk_right":   create_anim_sprite(1, 0, 2, 1/16),
			"player_idle_left":    create_static_sprite(0, 1),
			"player_walk_left":    create_anim_sprite(1, 1, 2, 1/16),
			"checkpoint_inactive": create_anim_sprite(3, 0, 4, 1/4),
			"checkpoint_active":   create_anim_sprite(3, 1, 4, 1/4),
		};
	}
	
	function start_game() {
		load_level(window.minia_level || "level01", respawn);
	}
	
	function reset_state() {
		if (level.timermap) {
			$.each(level.timermap, function(k, v) {
				clearTimeout(v);
			});
		}
		level.timermap = {};
		
		camera_shake = 0;
		camera_shake_decrement = 1;
		
		particles = [];
		level.tiles = [];
		level.tiledata = [];
		level.entities = [];
	}
	
	function respawn() {
		// Initialize player
		player = {
			"x":          level.startpos[0] * 8,
			"y":          level.startpos[1] * 8,
			"x_velocity": 0,
			"y_velocity": 0,
			"direction":  "right",
			"alive":      true,
			"active":     true,
			"visible":    true,
		};
		
		reset_state();
		
		// Render tiles
		ctx_level.clearRect(0, 0, level.width * 8, level.height * 8);
		for (var x = 0; x < level.width; x++) {
			var t = [];
			var td = [];
			
			for (var y = 0; y < level.height; y++) {
				var n = level.tiles_orig[x][y];
				
				if (n) {
					if (n == 7) {
						n = 0;
						level.entities.push({ "x": x * 8, "y": y * 8, "type": "checkpoint", "state": "inactive", "sprite": "checkpoint_inactive" });
					}
					else ctx_level.drawImage(tiles[n], x * 8, y * 8);
				}
				
				t.push(n);
				td.push(0);
			}
			
			level.tiles.push(t);
			level.tiledata.push(td);
		}
		
		// Start working :3
		think();
	}
	
	function redraw_tile(x, y) {
		ctx_level.clearRect(x * 8, y * 8, 8, 8);
		
		var t = level.tiles[x][y];
		if (t && t != 7) {
			ctx_level.drawImage(tiles[t], x * 8, y * 8);
		}
	}
	
	function input_key_down(e) {
		var k = e.keyCode;
		
		if (k == 37) {
			player.walk_left = 1;
		}
		else if (k == 39) {
			player.walk_right = 1;
		}
		else if (k == 38) {
			player.jumping = 1;
		}
		else if (k == 82 && !level.cleared) {	// r - respawn
			respawn();
		}
		else if (k == 13 && level.cleared) {	// enter - next level
			reset_state();
			load_level(level.next_level, respawn);
		}
		
		// Debug keys
		else if (debug_mode && k == 67 && think_step) {		// c - continue
			think_step = 0;
			think();
		}
		else if (debug_mode && k == 83) {	// s - step
			think_step = 1;
			think();
		}
		else if (debug_mode && k == 68) {	// d - toggle debug info
			debug_info = !debug_info;
		}
		
		// Debugging
		//else console.log(k);
	}
	
	function input_key_up(e) {
		var k = e.keyCode;
		
		if (k == 37) {
			player.walk_left = 0;
		}
		else if (k == 39) {
			player.walk_right = 0;
		}
		else if (k == 38) {
			player.jumping = 0;
		}
	}
	
	function draw_sprite(n, x, y) {
		ctx_root.drawImage(sprites[n].frame, x, y);
	}
	
	function spawn_particle(x, y, angle, velocity, color, life, sticky) {
		if (particles.length >= 8192) return;
		
		var p = {
			"x": x,
			"y": y,
			"x_velocity": Math.cos(angle) * velocity,
			"y_velocity": Math.sin(angle) * velocity,
			"velocity": velocity,
			"color": color,
			"life": life,
			"sticky": sticky
		};
		
		particles.push(p);
	}
	
	function linear(a, b, n) { return a + (b - a) * n; }
	
	function explode(x, y, w, h, count, min_velocity, max_velocity, color_min, color_max, life, sticky) {
		for (var i = 0; i < (count || 256); i++) {
			var n = Math.random();
			
			spawn_particle(
				x + Math.random() * w,
				y + Math.random() * h,
				Math.random() * (Math.PI * 2),
				linear(min_velocity, max_velocity, Math.random()),
				[
					Math.round(linear(color_min[0], color_max[0], n)),
					Math.round(linear(color_min[1], color_max[1], n)),
					Math.round(linear(color_min[2], color_max[2], n))
				],
				life || 100,
				sticky);
		}
	}
	
	function explode_tile(x, y) {
		if (x < 0 || x >= level.width || y < 0 || y >= level.height) return;
		if (!level.tiles[x][y]) return;
		
		var c = tile_explode_colormap[level.tiles[x][y]];
		explode(x * 8, y * 8, 8, 8, 32, 0.0, 4.0, c[0], c[1], 25);
		
		level.tiles[x][y] = 0;
		redraw_tile(x, y);
	}
	
	function explode_tile_chain(x, y) {
		if (x < 0 || x >= level.width || y < 0 || y >= level.height) return;
		if (!level.tiles[x][y]) return;
		if (level.timermap["expchain_" + x + "_" + y]) return;
		
		explode_tile(x, y);
		
		level.timermap["expchain_" + x + "_" + y] = setTimeout(function() {
				delete(level.timermap["expchain_" + x + "_" + y]);
				
				explode_tile_chain(x - 1, y);
				explode_tile_chain(x + 1, y);
				explode_tile_chain(x, y - 1);
				explode_tile_chain(x, y + 1);
			},
			75);
	}
	
	function check_tiles_below(x, y) {
		var t = level.tiles[x][y];
		
		if (t == 2) {
			if (++level.tiledata[x][y] == 7) {
				if (level.tiles[x][y - 1] == 4) level.tiles[x][y] = 4;
				else level.tiles[x][y] = 0;
				
				redraw_tile(x, y);
				
				for (var i = 0; i < 32; i++) {
					spawn_particle(x * 8 + Math.random() * 8, y * 8 + Math.random() * 8, Math.random() * (Math.PI * 2), Math.random() * 4.0, [0, Math.round(Math.random() * 128), Math.round(128 + Math.random() * 128)], 100, false);
				}
			}
		}
	}
	
	function check_tiles(x, y) {
		var t = level.tiles[x][y];
		
		if (t == 6) {
			player.active = false;
			player.visible = false;
			level.cleared = true;
			
			camera_shake = 10;
			camera_shake_decrement = 0.15;
			
			explode_tile_chain(x, y);
			explode(x * 8, y * 8, 8, 8, 64, 0.0, 4.0, [ 0, 128, 0 ], [ 96, 255, 96 ]);
			
			if (level.exits[x + "," + y]) {
				level.next_level = level.exits[x + "," + y];
			}
		}
		else if (t == 11) {
			player.active = false;
			player.visible = false;
			level.cleared = true;
			level.potato = true;
			
			camera_shake = 10;
			camera_shake_decrement = 0.15;
			
			explode_tile_chain(x, y);
			explode(x * 8, y * 8, 8, 8, 64, 0.0, 4.0, [ 0, 128, 0 ], [ 96, 255, 96 ]);
		}
	}
	
	function think() {
		var debug_text = [];
		
		// ====================================================================================
		// Player
		// ====================================================================================
		
		if (player.alive && player.active) {
			// Update coordinates
			player.x = Math.round(player.x + player.x_velocity);
			player.y = Math.round(player.y + player.y_velocity);
			
			// Get tile coordinates
			var p_lx = Math.floor(player.x / 8);
			var p_rx = Math.floor((player.x + 7) / 8);
			var p_ty = Math.floor(player.y / 8);
			var p_by = Math.floor((player.y + 8) / 8);
			var p_by2 = Math.floor((player.y + 7) / 8);
			
			// Jumping
			if (player.jumping && !player.air) {
				player.y_velocity = -5.0;
				player.air = 1;
			}
			
			var p_jy = Math.floor((player.y + player.y_velocity) / 8);
			if (player.y_velocity < 0 && (tiledata[level.tiles[p_lx][p_jy]] & 0x01 || tiledata[level.tiles[p_rx][p_jy]] & 0x01)) {
				player.y_velocity = 0;
				player.y = p_jy * 8 + 8;
				
				p_ty = Math.floor(player.y / 8);
				p_by = Math.floor((player.y + 8) / 8);
				p_by2 = Math.floor((player.y + 7) / 8);
			}
			
			// Falling
			if (tiledata[level.tiles[p_lx][p_by]] & 0x01 || tiledata[level.tiles[p_rx][p_by]] & 0x01) {
				if (player.y_velocity > 0) {
					//player.y_velocity = -player.y_velocity / 4;
					player.y_velocity = 0;
				}
				
				if (player.y_velocity > -0.5) player.y_velocity = 0;
				
				player.y = p_ty * 8;
				player.air = 0;
				
				p_ty = Math.floor(player.y / 8);
				p_by = Math.floor((player.y + 8) / 8);
				p_by2 = Math.floor((player.y + 7) / 8);
			}
			else {
				player.air = 1;
				if (player.y_velocity < 8.0) player.y_velocity += 0.5;
			}
			
			// Walking
			if (player.walk_left ^ player.walk_right) {
				if (player.walk_left && player.x_velocity > -2.0) {
					if (player.x_velocity > 0.0) player.x_velocity = 0;
					else player.direction = "left";
					
					player.x_velocity -= 1;
				}
				
				if (player.walk_right && player.x_velocity < 2.0) {
					if (player.x_velocity < 0.0) player.x_velocity = 0;
					else player.direction = "right";
					
					player.x_velocity += 1;
				}
			}
			
			var p_lxv = Math.floor((player.x + player.x_velocity) / 8);
			var p_rxv = Math.floor((player.x + player.x_velocity + 8) / 8);
			
			debug_text.push("[player] x=" + player.x + " y=" + player.y + " p_ty=" + p_ty + " p_by2=" + p_by2 + " xvel=" + player.x_velocity.toFixed(2) + " air=" + player.air);
			debug_text.push("[walking] p_lxv=" + p_lxv + " p_rxv=" + p_rxv);
			
			if (tiledata[level.tiles[p_lxv][p_ty]] & 0x01 || (player.air && (tiledata[level.tiles[p_lxv][p_by2]] & 0x01))) {
				player.x_velocity = 0;
				player.x = p_lxv * 8 + 8;
			}
			
			if (tiledata[level.tiles[p_rxv][p_ty]] & 0x01 || (player.air && (tiledata[level.tiles[p_rxv][p_by2]] & 0x01))) {
				player.x_velocity = 0;
				player.x = p_rxv * 8 - 8;
			}
			
			player.walking = player.walk_left ^ player.walk_right;
			if (!player.walking) player.x_velocity /= 2;
			
			// Tile interaction
			// =========================================================
			// Death?
			if (tiledata[level.tiles[p_lx][p_ty]] & 0x02 || tiledata[level.tiles[p_rx][p_ty]] & 0x02 || tiledata[level.tiles[p_lx][p_by2]] & 0x02 || tiledata[level.tiles[p_rx][p_by2]] & 0x02) {
				player.alive = false;
				player.active = false;
				
				for (var i = 0; i < 128; i++) {
					spawn_particle(player.x + Math.random() * 8, player.y + Math.random() * 8, Math.random() * (Math.PI * 2), Math.random() * 4.0, [Math.round(128 + Math.random() * 128), 0, 0], 100, true);
				}
				
				for (var i = 0; i < 128; i++) {
					spawn_particle(player.x + 4, player.y + 4, Math.random() * (Math.PI * 2), 3.0 + Math.random(), [Math.round(128 + Math.random() * 128), 0, 0], 100, true);
				}
				
				camera_shake = 2;
				camera_shake_decrement = 0.3;
			}
			
			check_tiles_below(p_lx, p_by);
			check_tiles_below(p_rx, p_by);
			check_tiles(p_lx, p_ty);
			check_tiles(p_rx, p_ty);
		}
		
		// ====================================================================================
		// Entities
		// ====================================================================================
		for (var i = 0; i < level.entities.length; i++) {
			var e = level.entities[i];
			
			if (e.type == "checkpoint" && e.state == "inactive") {
				if (player.x + 4 >= e.x && player.x + 4 < e.x + 8 && player.y + 4 >= e.y && player.y + 4 < e.y + 8) {
					e.state = "active";
					e.sprite = "checkpoint_active";
					
					level.startpos[0] = Math.floor(e.x / 8);
					level.startpos[1] = Math.floor(e.y / 8);
				}
			}
		}
		
		// ====================================================================================
		// Particles
		// ====================================================================================
		for (var i = 0, j = particles.length; i < j; i++) {
			var p = particles[i];
			
			if (!--p.life) {
				particles.splice(i, 1);
				i--;
				j--;
				continue;
			}
			
			var nx = p.x + p.x_velocity;
			var ny = p.y + p.y_velocity;
			
			var tx = Math.floor(p.x / 8);
			var ty = Math.floor(p.y / 8);
			
			var tnx = Math.floor(nx / 8);
			var tny = Math.floor(ny / 8);
			
			if (tnx < 0 || tnx >= level.width || tny < 0 || tny >= level.height) {
				particles.splice(i, 1);
				i--;
				j--;
				continue;
			}
			
			p.y_velocity += 0.1;
			
			if (p.sticky) {
				// Stick to tiles?
				if (tiledata[level.tiles[tx][ty]] & 0x01) {
					ctx_level.fillStyle = "rgb(" + p.color[0] + "," + p.color[1] + "," + p.color[2] + ")";
					ctx_level.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
					
					particles.splice(i, 1);
					i--;
					j--;
				}
			}
			else {
				// Collision detection
				if (tiledata[level.tiles[tnx][ty]] & 0x01) {
					p.x_velocity = -p.x_velocity / 2;
					nx = p.x + p.x_velocity;
				}
				
				if (tiledata[level.tiles[tx][tny]] & 0x01) {
					p.y_velocity = -p.y_velocity / 4;
					p.x_velocity /= 2;
					ny = p.y + p.y_velocity;
				}
			}
			
			p.x = nx;
			p.y = ny;
		}
		
		// ====================================================================================
		// Camera and background
		// ====================================================================================
		// Calculate camera position
		var camera_x = player.x + 4 - 160;
		var camera_y = player.y + 4 - 120;
		
		if (camera_shake) {
			camera_x += -camera_shake + Math.random() * camera_shake * 2;
			camera_y += -camera_shake + Math.random() * camera_shake * 2;
			
			camera_shake -= camera_shake_decrement;
			if (camera_shake < 0) camera_shake = 0;
		}
		
		if (camera_x < 0) camera_x = 0;
		if (camera_y < 0) camera_y = 0;
		if (camera_x > level.width * 8 - 320) camera_x = level.width * 8 - 320;
		if (camera_y > level.height * 8 - 240) camera_y = level.height * 8 - 240;
		
		// Background
		var bg_x = Math.round((level.background_ref.width - 320) * (camera_x / (level.width * 8 - 320)));
		var bg_y = Math.round((level.background_ref.height - 240) * (camera_y / (level.height * 8 - 240)));
		ctx_root.drawImage(level.background_ref, -bg_x, -bg_y);
		
		// Draw level
		ctx_root.drawImage(cv_level, -camera_x, -camera_y);
		
		// Draw player sprite
		if (player.alive && player.visible) draw_sprite((player.walking ? "player_walk_" : "player_idle_") + player.direction, player.x - camera_x, player.y - camera_y);
		
		// Draw entities
		for (var i = 0; i < level.entities.length; i++) {
			var e = level.entities[i];
			
			draw_sprite(e.sprite, e.x - camera_x, e.y - camera_y);
		}
		
		// Draw particles
		for (var i = 0, j = particles.length; i < j; i++) {
			var p = particles[i];
			
			ctx_root.fillStyle = "rgb(" + p.color[0] + "," + p.color[1] + "," + p.color[2] + ")";
			ctx_root.fillRect(Math.round(p.x) - camera_x, Math.round(p.y) - camera_y, 1, 1);
		}
		
		// Print stats
		if (debug_info) {
			ctx_root.font = "8px Tahoma";
			ctx_root.textBaseline = "top";
			ctx_root.textAlign = "left";
		
			ctx_root.fillStyle = "#fff";
			ctx_root.fillText("FPS: " + fps, 4, 4);
			ctx_root.fillText("P: " + particles.length, 48, 4);
		
			for (var i = 0; i < debug_text.length; i++) {
				ctx_root.fillText(debug_text[i], 4, 16 + i * 10);
			}
		}
		
		// Dead?
		if (!player.alive) {
			ctx_root.font = "bold 12px Tahoma";
			ctx_root.textBaseline = "middle";
			ctx_root.textAlign = "center";
			
			var msg = "You're dead ~ Press R to respawn";
			
			ctx_root.fillStyle = "#000";
			ctx_root.fillText(msg, 159, 119);
			ctx_root.fillText(msg, 161, 119);
			ctx_root.fillText(msg, 159, 121);
			ctx_root.fillText(msg, 161, 121);
			
			ctx_root.fillStyle = "#fff";
			ctx_root.fillText(msg, 160, 120);
		}
		
		if (level.cleared) {
			ctx_root.font = "bold 12px Tahoma";
			ctx_root.textBaseline = "middle";
			ctx_root.textAlign = "center";
			
			var msg = "Level cleared ~ Press enter to continue";
			if (level.potato) msg = "~ You found the secret potato ~";
	
			ctx_root.fillStyle = "#000";
			ctx_root.fillText(msg, 159, 119);
			ctx_root.fillText(msg, 161, 119);
			ctx_root.fillText(msg, 159, 121);
			ctx_root.fillText(msg, 161, 121);
	
			ctx_root.fillStyle = "#fff";
			ctx_root.fillText(msg, 160, 120);
		}
		
		// Draw to screen
		screen_ctx.drawImage(cv_root, 0, 0, screen.width, screen.height);
		
		// Update sprite animations
		for (var i = 0, j = animsprites.length; i < j; i++) {
			var s = animsprites[i];
			
			s.time += 1/30;
			while (s.time >= s.interval) {
				s.time -= s.interval;
				s.counter = (s.counter + 1) % s.frames.length;
				s.frame = s.frames[s.counter];
			}
		}
		
		// NEEEEEEEEEEEEEXT!
		fpsc++;
		if (!think_step) level.timermap["think"] = setTimeout(think, 1000/30);
	}
	
	function count_fps() {
		fps = fpsc;
		fpsc = 0;
	}
	setInterval(count_fps, 1000);
});

