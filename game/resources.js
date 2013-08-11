window.Minia.Resources = new (function() {
	var self = this;
	
	self.resmap = {};
	
	var sprites;
	var tiles;
	
	var resources = [
		{ "name": "splash",      "file": "/gfx/splash.png",      "type": "gfx" },
		{ "name": "menu_bg",     "file": "/gfx/menu_bg.png",     "type": "gfx" },
		{ "name": "menu_header", "file": "/gfx/menu_header.png", "type": "gfx" },
		{ "name": "sprites",     "file": "/gfx/sprites.png",     "type": "gfx" },
		{ "name": "tiles",       "file": "/gfx/tiles.png",       "type": "gfx" },
		{ "name": "bg",          "file": "/gfx/bg.png",          "type": "gfx" },
		{ "name": "bg2",         "file": "/gfx/bg2.png",         "type": "gfx" },
		{ "name": "bg3",         "file": "/gfx/bg3.png",         "type": "gfx" }
	];
	
	self.tiledata = [
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
	
	function process_resources() {
		console.log("Initializing resources...");
		process_tiles();
		process_sprites();
		
		self.sprites = sprites;
		self.tiles = tiles;
	}

	function process_tiles() {
		var res = self.resmap["tiles"];
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

