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

window.Minia.Menu = new (function() {
	var self = this;
	
	self.name = "Menu";
	
	var main;
	var ctx;
	
	var img_cursor;
	var img_bg;
	var img_header;
	var img_raindrop;
	var img_nothumb;
	
	var cv_version;
	var ctx_version;
	
	var menu;
	
	var raindrops = [];
	
	// Main menu
	// -------------------------------------
	var cv_mainmenu;
	var ctx_mainmenu;
	
	var cursor_rotate = 0.0;
	
	var mainmenu_current = 0;
	var mainmenu_count = 2;
	var mainmenu_entries = [
		"Start game",
		"Play level...",
		"Sound/Music: N/A",
		"Effects: High"
	];
	
	// Level select menu
	// -------------------------------------
	var cv_levelselect;
	var ctx_levelselect;
	
	var levelselect_update;
	var levelselect_current;
	
	var levelmap;
	var levelthumbs = {};
	
	function render_mainmenu() {
		// Clear everything
		ctx_mainmenu.clearRect(0, 0, cv_mainmenu.width, cv_mainmenu.height);
		
		// Draw background
		ctx_mainmenu.fillStyle = "#000";
		ctx_mainmenu.globalAlpha = 0.25;
		ctx_mainmenu.fillRect(0, 0, cv_mainmenu.width, cv_mainmenu.height);
		ctx_mainmenu.globalAlpha = 1.0;
		
		// Draw menu options
		for (var i = 0; i < mainmenu_count; i++) {
			var t = mainmenu_entries[i];
			
			ctx_mainmenu.fillStyle = "#000";
			ctx_mainmenu.fillText(t, 32, 4 + (24 * i) + 1);
			ctx_mainmenu.fillText(t, 32, 4 + (24 * i) - 1);
			ctx_mainmenu.fillText(t, 31, 4 + (24 * i));
			ctx_mainmenu.fillText(t, 33, 4 + (24 * i));
			
			ctx_mainmenu.fillStyle = "#fff";
			ctx_mainmenu.fillText(t, 32, 4 + (24 * i));
		}
		
		// Draw cursor
		ctx_mainmenu.save();
		ctx_mainmenu.translate(16, 16 + mainmenu_current * 24);
		ctx_mainmenu.rotate(cursor_rotate);
		ctx_mainmenu.drawImage(img_cursor, 0, 0, 8, 8, -8, -8, 16, 16);
		ctx_mainmenu.restore();
		
		// I'M SPINNING!
		cursor_rotate += 0.125;
		if (cursor_rotate >= 6.283) cursor_rotate -= 6.283;
		
		// Render to screen
		ctx.drawImage(cv_mainmenu, 160 - cv_mainmenu.width / 2, 72);
	}
	
	function render_levelselect() {
		if (levelselect_update) {
			levelselect_update = 0;
			
			var level_id = levelmap.levelindex[levelselect_current];
			var level = levelmap.levels[level_id];
			
			// Clear everything
			ctx_levelselect.clearRect(0, 0, cv_levelselect.width, cv_levelselect.height);
		
			// Draw background
			ctx_levelselect.fillStyle = "#000";
			ctx_levelselect.globalAlpha = 0.25;
			ctx_levelselect.fillRect(0, 0, cv_levelselect.width, cv_levelselect.height);
			ctx_levelselect.globalAlpha = 1.0;
			
			// Draw level name
			ctx_levelselect.font = "bold 14px 'Trebuchet MS','Tahoma','Bitstream Vera Sans','sans'";
			ctx_levelselect.textAlign = "center";
			ctx_levelselect.textBaseline = "top";
			
			var t = "#" + (levelselect_current + 1) + " - " + level.title;
			
			ctx_levelselect.fillStyle = "#000";
			ctx_levelselect.fillText(t, cv_levelselect.width / 2, 3);
			ctx_levelselect.fillText(t, cv_levelselect.width / 2, 5);
			ctx_levelselect.fillText(t, cv_levelselect.width / 2 - 1, 4);
			ctx_levelselect.fillText(t, cv_levelselect.width / 2 + 1, 4);
			
			ctx_levelselect.fillStyle = "#fff";
			ctx_levelselect.fillText(t, cv_levelselect.width / 2, 4);
			
			// Draw thumbnail or placeholder
			ctx_levelselect.strokeStyle = "#000";
			ctx_levelselect.lineWidth = 1.0;
			
			if (!levelthumbs[level_id] && level.thumbnail) {
				var img = new Image();
				img.onload = function() {
					levelthumbs[level_id] = img;
					levelselect_update = 1;
				};
				img.src = level.thumbnail;
			}
			
			ctx_levelselect.drawImage(levelthumbs[level_id] || img_nothumb, 8, 28);
			ctx_levelselect.strokeRect(8, 28, 80, 60);
		}
		
		// Render to screen
		ctx.drawImage(cv_levelselect, 160 - cv_levelselect.width / 2, 72);
	}
	
	function render_rain() {
		img_raindrop = Minia.Resources.sprites["player_walk_right"].frame;
		ctx.globalAlpha = 0.8;
		
		for (var i = 0, j = raindrops.length; i < j; i++) {
			var r = raindrops[i];
			
			if (r.y >= 240) {
				r.y = -16;
				r.x = -8 + Math.round(Math.random() * 336);
				r.speed = 1 + Math.round(Math.random() * 3);
			}
			
			if (r.upsidedown) {
				ctx.save();
					ctx.translate(8, 0);
					ctx.scale(1, -1);
					ctx.drawImage(img_raindrop, r.x, -8 - r.y);
				ctx.restore();
			}
			else ctx.drawImage(img_raindrop, r.x, r.y);
			
			r.y += r.speed;
		}
		
		ctx.globalAlpha = 1.0;
	}
	
	self.start = function(_main, _ctx) {
		main = _main;
		ctx = _ctx;
		
		menu = "mainmenu";
		
		// Create mainmenu canvas
		cv_mainmenu = document.createElement("canvas");
		ctx_mainmenu = cv_mainmenu.getContext("2d");
		
		cv_mainmenu.width = 180;
		cv_mainmenu.height = 8 + mainmenu_count * 24;
		
		// Create levelselect canvases
		cv_levelselect = document.createElement("canvas");
		ctx_levelselect = cv_levelselect.getContext("2d");
		
		cv_levelselect.width = 240;
		cv_levelselect.height = 96;
		
		levelselect_update = 1;
		levelselect_current = 0;
		
		// Create version info canvas
		cv_version = document.createElement("canvas");
		ctx_version = cv_version.getContext("2d");
		
		cv_version.width = 200;
		cv_version.height = 10;
		
		// Disable smooth scaling on canvases
		main.disable_canvas_smoothing(ctx_mainmenu);
		main.disable_canvas_smoothing(ctx_levelselect);
		main.disable_canvas_smoothing(ctx);
		
		// Get some resources we need
		img_cursor = Minia.Resources.tiles[4];
		img_bg = Minia.Resources.resmap.menu_bg.ref;
		img_header = Minia.Resources.resmap.menu_header.ref;
		img_nothumb = Minia.Resources.resmap.nothumb.ref;
		levelmap = Minia.Resources.resmap.levels.ref;
		
		// Reset some stuff for the canvases
		ctx.fillStyle = "#000";
		ctx.globalAlpha = 1.0;
		
		ctx_mainmenu.font = "bold 16px 'Trebuchet MS','Tahoma','Bitstream Vera Sans','sans'";
		ctx_mainmenu.textAlign = "left";
		ctx_mainmenu.textBaseline = "top";
		
		// Spawn raindrops
		raindrops = [];
		for (var i = 0; i < 5; i++) {
			raindrops.push({
				"x": -8 + Math.round(Math.random() * 336),
				"y": Math.round(Math.random() * 240),
				"speed": 1 + Math.round(Math.random() * 3),
			});
		}
		
		raindrops[0].upsidedown = 1;
		
		// Render version information once
		ctx_version.font = "8px 'Tahoma','Bitstream Vera Sans','sans'";
		ctx_version.textAlign = "left";
		ctx_version.textBaseline = "top";
		
		var v = "Version " + window.Minia.Main.version;
		
		ctx_version.fillStyle = "#000";
		ctx_version.fillText(v, 1, 0);
		ctx_version.fillText(v, 1, 2);
		ctx_version.fillText(v, 0, 1);
		ctx_version.fillText(v, 2, 1);
		
		ctx_version.fillStyle = "#fff";
		ctx_version.fillText(v, 1, 1);
	};
	
	self.frame = function() {
		ctx.globalAlpha = 1.0;
		ctx.drawImage(img_bg, 0, 0);
		render_rain();
		ctx.drawImage(img_header, 160 - img_header.width / 2, 16);
		
		if (menu == "mainmenu") render_mainmenu();
		else if (menu == "levelselect") render_levelselect();
		
		ctx.globalAlpha = 0.35;
		ctx.drawImage(cv_version, 0, 240 - cv_version.height);
	};
	
	self.stop = function() { };
	
	self.input_key_down = function(e) {
		var k = e.keyCode;
	
		if (k == 37) {			// Left
			if (menu == "levelselect") {
				levelselect_current--;
				if (levelselect_current < 0) levelselect_current += levelmap.levelindex.length;
				levelselect_update = 1;
			}
		}
		else if (k == 39) {		// Right
			if (menu == "levelselect") {
				levelselect_current = (levelselect_current + 1) % levelmap.levelindex.length;
				levelselect_update = 1;
			}
		}
		else if (k == 38) {		// Up
			if (menu == "mainmenu") {
				mainmenu_current--;
				if (mainmenu_current < 0) mainmenu_current += mainmenu_count;
			}
		}
		else if (k == 40) {		// Down
			if (menu == "mainmenu") {
				mainmenu_current = (mainmenu_current + 1) % mainmenu_count;
			}
		}
		else if (k == 13) {		// Enter
			if (menu == "mainmenu") {
				switch (mainmenu_current) {
					case 0:
						window.Minia.Game.set_level("level01");
						main.start_controller(window.Minia.Game);
						break;
					
					case 1:
						menu = "levelselect";
						break;
				}
			}
			else if (menu == "levelselect") {
				window.Minia.Game.set_level(levelmap.levelindex[levelselect_current]);
				main.start_controller(window.Minia.Game);
			}
		}
		else if (k == 27) {		// Escape
			if (menu == "levelselect") {
				menu = "mainmenu";
			}
		}
	}
});

