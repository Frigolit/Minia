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

window.Minia.Game = new (function() {
	var self = this;
	var base_url = "game";
	
	self.name = "Game";
	
	// References
	var main;
	var ctx_root;
	
	var resmap;
	var sprites;
	var tiles;
	var tiledata;
	var tile_explode_colormap;
	
	// Canvases
	var cv_level = document.createElement("canvas");
	var ctx_level = cv_level.getContext("2d");
	
	var cv_levelbg = document.createElement("canvas");
	var ctx_levelbg = cv_levelbg.getContext("2d");
	
	// Level
	var levelsrc;
	var level;
	var player;
	
	// Camera stuff
	var camera_shake = 0;
	var camera_shake_decrement = 1;
	
	// Misc
	var fps = 0, fpsc = 0;
	var think_step = 0;
	var debug_info = false;
	
	var TILE_BLUEBLOCK;
	var TILE_EXIT;
	var TILE_POTATO;
	
	function bind_objects() {
		resmap = window.Minia.Resources.resmap;
		sprites = window.Minia.Resources.sprites;
		tiles = window.Minia.Resources.tiles;
		tilemap = window.Minia.Resources.tilemap;
		tiledata = window.Minia.Resources.tiledata;
		tile_explode_colormap = window.Minia.Resources.tile_explode_colormap;
	}
	
	self.start = function(_main, _ctx) {
		main = _main;
		ctx_root = _ctx;
		
		ctx_root.globalAlpha = 1.0;
	};
	
	self.stop = function() {
		reset_state();
		level = undefined;
		player = undefined;
	};
	
	self.input_key_down = function(e) {
		var k = e.keyCode;
	
		if (((!player.alive && (k == 32 || k == 90 || k == 13)) || k == 82) && !level.cleared) {	// r - respawn
			respawn();
		}
		else if (k == 37) {
			player.walk_left = 1;
		}
		else if (k == 39) {
			player.walk_right = 1;
		}
		else if (k == 38 || k == 32 || k == 90) {
			player.jumping = 1;
		}
		else if (k == 13 && level.cleared) {	// enter - next level
			reset_state();
			load_level(level.next_level);
			respawn();
		}
		else if (k == 27) {		// Escape - Exit to menu
			window.Minia.Main.start_controller(window.Minia.Menu);
		}
	
		// Debug keys
		/*
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
		*/
	
		// Debugging
		//else console.log(k);
	};

	self.input_key_up = function(e) {
		var k = e.keyCode;
	
		if (k == 37) {
			player.walk_left = 0;
		}
		else if (k == 39) {
			player.walk_right = 0;
		}
		else if (k == 38 || k == 32 || k == 90) {
			player.jumping = 0;
		}
	};
	
	function json_copy(src) {
		return JSON.parse(JSON.stringify(src));
	}
	
	function load_level(n) {
		bind_objects();
		
		TILE_BLUEBLOCK = tiles.indexOf(tilemap["blueblock"]);
		TILE_EXIT      = tiles.indexOf(tilemap["exit"]);
		TILE_POTATO    = tiles.indexOf(tilemap["potato"]);
		
		var d = window.Minia.Resources.resmap.levels.ref.levels[n];
		
		levelsrc = d;
		level = {};
		
		level.title = levelsrc.title;
		level.width = levelsrc.width;
		level.height = levelsrc.height;
		level.exits = levelsrc.exits;
		
		/*
		if (!level.tiles_orig) level.tiles_orig = JSON.parse(level.tiles_json);
		if (!level.next_level_orig) level.next_level_orig = level.next_level;
		if (!level.startpos_orig) level.startpos_orig = level.startpos;
		*/
		
		level.tiles_orig = json_copy(levelsrc.layers.main);
		
		level.tiles = [];
		level.tiledata = [];
		
		// Initialize layers
		level.layers = {};
		$.each(levelsrc.layers, function(k, v) {
			if (k == "main") return;
			
			level.layers[k] = {
				"tiles": json_copy(v),
			};
		});
		
		if (level.layers.background) {
			level.layers.background.ctx = ctx_levelbg;
		}
		
		// Initialize exit lookup mapping
		level.exitmap = {};
		for (var i = 0; i < level.exits.length; i++) {
			var e = level.exits[i];
			level.exitmap[e.x + "," + e.y] = e;
		}
		
		// Process entities
		for (var i = 0; i < levelsrc.entities.length; i++) {
			var e = levelsrc.entities[i];
			if (e.type == "player") {
				level.startpos_initial = [ e.x, e.y ];
			}
		}
		
		level.cleared = false;
		level.startpos = level.startpos_initial;
		
		level.background_ref = (resmap[levelsrc.background] || resmap["bg2"]).ref;
		
		cv_level.width = level.width * 8;
		cv_level.height = level.height * 8;
		
		cv_levelbg.width = cv_level.width;
		cv_levelbg.height = cv_level.height;
		
		reset_state();
		init_level();
		
		console.log("Loaded level: " + level.title);
	}
	
	self.set_level = function(l) {
		load_level(l);
		respawn();
	};
	
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
		
		// Reset tiles and tile data
		for (var x = 0; x < level.width; x++) {
			for (var y = 0; y < level.height; y++) {
				if (level.tiles_orig[x][y] == TILE_BLUEBLOCK) {
					// Redraw blue blocks
					level.tiles[x][y] = level.tiles_orig[x][y];
					redraw_tile(x, y);
				}
				/*
				else if (level.tiles_orig[x][y] == 7) {	// FIXME
					// Checkpoint entity
					level.entities.push({ "x": x * 8, "y": y * 8, "type": "checkpoint", "state": "inactive", "sprite": "checkpoint_inactive" });
				}
				*/
				
				// Always reset tile data
				level.tiledata[x][y] = 0;
			}
		}
		
		// Initialize entities
		for (var i = 0; i < levelsrc.entities.length; i++) {
			var e = levelsrc.entities[i];
			
			if (e.type == "checkpoint") {
				level.entities.push({ "x": e.x * 8, "y": e.y * 8, "type": "checkpoint", "state": "inactive", "sprite": "checkpoint_inactive" });
			}
		}
		
		// Draw exits
		for (var i = 0; i < level.exits.length; i++) {
			var e = level.exits[i];
			
			var potato = e.flags.indexOf("potato") > -1;
			
			level.tiles[e.x][e.y] = potato ? TILE_POTATO : TILE_EXIT;
			redraw_tile(e.x, e.y);
		}
	}
	
	function init_level() {
		ctx_level.clearRect(0, 0, level.width * 8, level.height * 8);
		for (var x = 0; x < level.width; x++) {
			// Process and draw main layer tiles
			var t = [];
			var td = [];
			
			for (var y = 0; y < level.height; y++) {
				var n = level.tiles_orig[x][y];
				
				if (n) {
					if (n == 7) n = 0;
					else ctx_level.drawImage(tiles[n], x * 8, y * 8);
				}
				
				t.push(n);
				td.push(0);
			}
			
			level.tiles.push(t);
			level.tiledata.push(td);
		}
		
		// Draw background layer tiles
		if (level.layers.background) {
			for (var y = 0; y < level.height; y++) {
				for (var x = 0; x < level.width; x++) {
					redraw_layer_tile(level.layers.background, x, y);
				}
			}
		}
	}
	
	function redraw_tile(x, y) {
		ctx_level.clearRect(x * 8, y * 8, 8, 8);
		
		var t = level.tiles[x][y];
		if (t) {
			ctx_level.drawImage(tiles[t], x * 8, y * 8);
		}
		
		level.tiledata[x][y] = 0;
	}
	
	function redraw_layer_tile(layer, x, y) {
		layer.ctx.clearRect(x * 8, y * 8, 8, 8);
		
		var t = layer.tiles[x][y];
		if (t) {
			layer.ctx.drawImage(tiles[t], x * 8, y * 8);
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
			
			try {
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
			catch (e) { }
		}
	}
	
	function explode_tile(x, y) {
		var bgl = level.layers.background;
		
		if (x < 0 || x >= level.width || y < 0 || y >= level.height) return;
		if (!level.tiles[x][y] && (!bgl || !bgl.tiles[x][y])) return;
		
		if (level.tiles[x][y]) {
			var c = tile_explode_colormap[level.tiles[x][y]];
			explode(x * 8, y * 8, 8, 8, 32, 0.0, 4.0, c[0], c[1], 25);
			
			level.tiles[x][y] = 0;
			redraw_tile(x, y);
		}
		
		if (bgl && bgl.tiles[x][y]) {
			var c = tile_explode_colormap[bgl.tiles[x][y]];
			explode(x * 8, y * 8, 8, 8, 32, 0.0, 4.0, c[0], c[1], 25);
			
			bgl.tiles[x][y] = 0;
			redraw_layer_tile(bgl, x, y);
		}
	}
	
	function explode_tile_chain(x, y) {
		var bgl = level.layers.background;
		
		if (x < 0 || x >= level.width || y < 0 || y >= level.height) return;
		if (!level.tiles[x][y] && (!bgl || !bgl.tiles[x][y])) return;
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
		
		if (t == TILE_BLUEBLOCK) {
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
		
		if (t == TILE_EXIT || t == TILE_POTATO) {
			var exit = level.exitmap[x + "," + y];
			
			level.next_level = exit.target;
			
			player.active = false;
			player.visible = false;
			level.cleared = true;
			if (exit.flags.indexOf("potato") > -1) level.potato = true;
			
			camera_shake = 10;
			camera_shake_decrement = 0.15;
			
			explode_tile_chain(x, y);
			explode(x * 8, y * 8, 8, 8, 64, 0.0, 4.0, [ 0, 128, 0 ], [ 96, 255, 96 ]);
		}
	}
	
	self.frame = function() {
		if (!player || !level) return;
		
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
					if (player.x_velocity < -2.0) player.x_velocity = -2.0;
				}
				
				if (player.walk_right && player.x_velocity < 2.0) {
					if (player.x_velocity < 0.0) player.x_velocity = 0;
					else player.direction = "right";
					
					player.x_velocity += 1;
					if (player.x_velocity > 2.0) player.x_velocity = 2.0;
				}
			}
			
			var p_lxv = Math.floor((player.x + player.x_velocity) / 8);
			var p_rxv = Math.floor((player.x + player.x_velocity + 8) / 8);
			
			if (debug_info) {
				debug_text.push("[player] x=" + player.x + " y=" + player.y + " p_ty=" + p_ty + " p_by2=" + p_by2 + " xvel=" + player.x_velocity.toFixed(2) + " air=" + player.air);
				debug_text.push("[walking] p_lxv=" + p_lxv + " p_rxv=" + p_rxv);
			}
			
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
		for (var i = 0, j = level.entities.length; i < j; i++) {
			var e = level.entities[i];
			
			if (e.type == "checkpoint" && e.state == "inactive") {
				if (player.x + 4 >= e.x && player.x + 4 < e.x + 8 && player.y + 4 >= e.y && player.y + 4 < e.y + 8) {
					e.state = "active";
					e.sprite = "checkpoint_active";
					
					level.startpos = [ Math.floor(e.x / 8), Math.floor(e.y / 8) ];
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
		ctx_root.drawImage(cv_levelbg, -camera_x, -camera_y);
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
			ctx_root.font = "8px 'Bitstream Vera Sans','Tahoma','sans'";
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
			ctx_root.font = "bold 12px 'Bitstream Vera Sans','Tahoma','sans'";
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
			ctx_root.font = "bold 12px 'Bitstream Vera Sans','Tahoma','sans'";
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
	};
})();

