//! Minia - http://frigolit.net/projects/minia
//! Copyright (C) 2013 Pontus "Frigolit" Rodling
//!
//! Licensed under the MIT license - See LICENSE for more information

window.Minia.Resources = new (function() {
	var self = this;
	
	self.resmap = {};
	
	var sprites;
	var tiles;
	
	var resources = [
		{ "name": "levels",      "file": "/levels.json",                     "type": "json" },
		{ "name": "tiles",       "file": "/tiles.json",                      "type": "json" },
		{ "name": "splash",      "file": "/gfx/splash.png",                  "type": "gfx" },
		{ "name": "menu_bg",     "file": "/gfx/menu_bg.png",                 "type": "gfx" },
		{ "name": "menu_header", "file": "/gfx/menu_header.png",             "type": "gfx" },
		{ "name": "nothumb",     "file": "/gfx/level_thumbnail_missing.png", "type": "gfx" },
		{ "name": "sprites",     "file": "/gfx/sprites.png",                 "type": "gfx" },
		{ "name": "bg",          "file": "/gfx/bg.png",                      "type": "gfx" },
		{ "name": "bg2",         "file": "/gfx/bg2.png",                     "type": "gfx" },
		{ "name": "bg3",         "file": "/gfx/bg3.png",                     "type": "gfx" }
	];
	
	self.tiledata = [];
	self.tilemap = [];
	
	// FIXME: The colormap is completely outdated
	self.tile_explode_colormap = [
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
	
	// Load resources
	function load_resources(base_url, cb_done, cb_loading) {
		for (var i = 0; i < resources.length; i++) {
			if (!resources[i].ref) {
				var res = resources[i];
				var url = base_url + res.file;
				
				cb_loading(res, url);
				
				console.log("Loading " + res.name + " (" + url + ")...");
				
				if (res.type == "gfx") {
					var img = new Image();
					img.onload = function() {
						res.ref = img;
						self.resmap[res.name] = res;
						load_resources(base_url, cb_done, cb_loading);
					};
					
					img.src = url;
				}
				else if (res.type == "json") {
					$.get(
						url,
						function(data) {
							res.ref = data;
							self.resmap[res.name] = res;
							load_resources(base_url, cb_done, cb_loading);
						});
				}
				
				return;
			}
		}
		
		console.log("Resources loaded!");
		cb_done();
	}
	
	function process_resources(cb) {
		console.log("Initializing resources...");
		process_tiles(0, function() {
			process_sprites();
		
			self.sprites = sprites;
			self.tiles = tiles;
			
			cb();
		});
	}

	function process_tiles(i, cb) {
		var res = self.resmap["tiles"].ref;
		
		if (!i) {
			tiles = [ undefined ];
			
			process_tiles(1, cb);
		}
		else {
			var tid = res.index[i];
			var t = res.tilemap[tid];
			
			console.log(tid, t);
			
			self.tiledata[i] = t.flags;
			
			var next = i + 1;
			
			var img = new Image();
			img.onload = function() {
				tiles.push(img);
				self.tilemap[tid] = img;
				
				if (next == res.index.length) cb();
				else process_tiles(next, cb);
			};
			
			img.src = t.png;
		}
	}

	function process_sprites() {
		animsprites = [];
	
		function get_frame(x, y) {
			var c = document.createElement("canvas");
			c.width = 8;
			c.height = 8;
			c.getContext("2d").drawImage(self.resmap.sprites.ref, x * 8, y * 8, 8, 8, 0, 0, 8, 8);
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

	self.get_tile_particles = function() {
		var r = [[]];

		var cv = document.createElement("canvas");
		var ctx = cv.getContext("2d");

		cv.width = 8;
		cv.height = 8;

		for (var i = 1, j = tiles.length; i < j; i++) {
			ctx.clearRect(0, 0, 8, 8);
			ctx.drawImage(tiles[i], 0, 0);

			var d = ctx.getImageData(0, 0, 8, 8);
			var tr = [];

			for (var y = 0; y < 8; y++) {
				for (var x = 0; x < 8; x++) {
					var ca = d.data[(x + y * 8) * 4 + 3];
					if (ca < 255) continue;

					var cr = d.data[(x + y * 8) * 4];
					var cg = d.data[(x + y * 8) * 4 + 1];
					var cb = d.data[(x + y * 8) * 4 + 2];

					tr.push([x, y, [cr, cg, cb]]);
				}
			}

			r.push(tr);
		}

		return r;
	};

	// Update sprite animations
	self.frame = function() {
		for (var i = 0, j = animsprites.length; i < j; i++) {
			var s = animsprites[i];
			
			s.time += 1 / 30;
			while (s.time >= s.interval) {
				s.time -= s.interval;
				s.counter = (s.counter + 1) % s.frames.length;
				s.frame = s.frames[s.counter];
			}
		}
	}
	
	// Bind functions
	this.load_resources = load_resources;
	this.process_resources = process_resources;
})();

