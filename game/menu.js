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
	
	var cv_menuopts;
	var ctx_menuopts;
	
	var cursor_rotate = 0.0;
	
	var menuopt_current = 0;
	var menuopt_count = 1;
	var menuopt_entries = [
		"Start game",
		"Play level...",
		"Sound/Music: N/A",
		"Effects: High"
	];
	
	var raindrops = [];
	
	function render_menuopts() {
		// Clear everything
		ctx_menuopts.clearRect(0, 0, cv_menuopts.width, cv_menuopts.height);
		
		// Draw background
		ctx_menuopts.fillStyle = "#000";
		ctx_menuopts.globalAlpha = 0.25;
		ctx_menuopts.fillRect(0, 0, cv_menuopts.width, cv_menuopts.height);
		ctx_menuopts.globalAlpha = 1.0;
		
		// Draw menu options
		for (var i = 0; i < menuopt_count; i++) {
			var t = menuopt_entries[i];
			
			ctx_menuopts.fillStyle = "#000";
			ctx_menuopts.fillText(t, 32, 4 + (24 * i) + 1);
			ctx_menuopts.fillText(t, 32, 4 + (24 * i) - 1);
			ctx_menuopts.fillText(t, 31, 4 + (24 * i));
			ctx_menuopts.fillText(t, 33, 4 + (24 * i));
			
			ctx_menuopts.fillStyle = "#fff";
			ctx_menuopts.fillText(t, 32, 4 + (24 * i));
		}
		
		// Draw cursor
		ctx_menuopts.save();
		ctx_menuopts.translate(16, 16 + menuopt_current * 24);
		ctx_menuopts.rotate(cursor_rotate);
		ctx_menuopts.drawImage(img_cursor, 0, 0, 8, 8, -8, -8, 16, 16);
		ctx_menuopts.restore();
		
		// I'M SPINNING!
		cursor_rotate += 0.125;
		if (cursor_rotate >= 6.283) cursor_rotate -= 6.283;
		
		// Render to screen
		ctx.drawImage(cv_menuopts, 160 - cv_menuopts.width / 2, 72);
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
		
		cv_menuopts = document.createElement("canvas");
		ctx_menuopts = cv_menuopts.getContext("2d");
		
		cv_menuopts.width = 180;
		cv_menuopts.height = 8 + menuopt_count * 24;
		
		main.disable_canvas_smoothing(ctx_menuopts);
		main.disable_canvas_smoothing(ctx);
		
		img_cursor = Minia.Resources.tiles[4];
		img_bg = Minia.Resources.resmap.menu_bg.ref;
		img_header = Minia.Resources.resmap.menu_header.ref;
		
		ctx.fillStyle = "#000";
		ctx.globalAlpha = 1.0;
		
		ctx_menuopts.font = "bold 16px 'Trebuchet MS','Tahoma','Bitstream Vera Sans','sans'";
		ctx_menuopts.textAlign = "left";
		ctx_menuopts.textBaseline = "top";
		
		// Spawn raindrops
		for (var i = 0; i < 5; i++) {
			raindrops.push({
				"x": -8 + Math.round(Math.random() * 336),
				"y": Math.round(Math.random() * 240),
				"speed": 1 + Math.round(Math.random() * 3),
			});
		}
		
		raindrops[0].upsidedown = 1;
	};
	
	self.frame = function() {
		ctx.drawImage(img_bg, 0, 0);
		render_rain();
		ctx.drawImage(img_header, 160 - img_header.width / 2, 16);
		render_menuopts();
	};
	
	self.stop = function() { };
	
	self.input_key_down = function(e) {
		var k = e.keyCode;
	
		if (k == 37) {
			// left
		}
		else if (k == 39) {
			// right
		}
		else if (k == 38) {
			menuopt_current--;
			if (menuopt_current < 0) menuopt_current += menuopt_count;
		}
		else if (k == 40) {
			menuopt_current = (menuopt_current + 1) % menuopt_count;
		}
		else if (k == 10 || k == 13) {
			if (menuopt_current == 0) {
				window.Minia.Game.set_level("level01");
				main.start_controller(window.Minia.Game);
			}
		}
	}
});

