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

window.Minia = { };

$(function() {
	window.Minia.Main = new (function() {
		var self = this;
		
		self.version = "0.4";
		
		// Make sure all components are loaded
		var reqcomps = [ "Game", "Menu", "Resources", "Splash" ];
		for (var i = 0, j = reqcomps.length; i < j; i++) {
			if (!window.Minia[reqcomps[i]]) {
				$("#fail").html("<img src=\"game/gfx/fission-mailed.png\" /><br/>ERROR: Required component \"Minia." + reqcomps[i] + "\" is missing!");
				return;
			}
		}
		
		// Sanity check
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
		
		// Map em' up
		var Game = window.Minia.Game;
		var Menu = window.Minia.Menu;
		var Resources = window.Minia.Resources;
		var Splash = window.Minia.Splash;
		
		// Some stuff here
		var controller;
		var resmap;
	
		// Screen canvas
		var el_content = $("#content");
	
		var screen_e = $("<canvas>");
		var screen = screen_e[0];
		var screen_ctx = screen.getContext("2d");
		
		function disable_canvas_smoothing(ctx) {
			ctx.imageSmoothingEnabled = false;
			ctx.mozImageSmoothingEnabled = false;
			ctx.oImageSmoothingEnabled = false;
			ctx.webkitImageSmoothingEnabled = false;
		}
		
		self.disable_canvas_smoothing = disable_canvas_smoothing;
	
		// Canvas resize function
		function resize() {
			var cw = el_content.width();
			var ch = el_content.height();
		
			cw = Math.floor(cw / cv_root.width) * cv_root.width;
			ch = Math.floor(ch / cv_root.height) * cv_root.height;
		
			var ca = cw / ch;
			var ta = cv_root.width / cv_root.height;
		
			if (ca > ta) {
				screen.width = ch * ta;
				screen.height = ch;
			}
			else {
				screen.width = cw;
				screen.height = cw / ta;
			}
		
			screen_e.css({
				"width": screen.width,
				"height": screen.height,
			});
		
			// Disable smoothing
			disable_canvas_smoothing(screen_ctx);
		}
		
		function start_controller(c) {
			console.log("Switching to " + (c ? (c.name ? "\"" + c.name + "\"" : "(unnamed)") : "(none)") + "...");
			
			if (controller) controller.stop();
			controller = c;
			if (controller) controller.start(self, ctx_root);
		}
		self.start_controller = start_controller;
		
		function input_key_down(e) {
			if (controller && controller.input_key_down) return controller.input_key_down(e);
		}
		
		function input_key_up(e) {
			if (controller && controller.input_key_up) return controller.input_key_up(e);
		}
		
		// Initialization
		// ========================================================================================
		
		// Create root canvas
		var cv_root = document.createElement("canvas");
		var ctx_root = cv_root.getContext("2d");
	
		cv_root.width = 320;
		cv_root.height = 240;
		
		disable_canvas_smoothing(ctx_root);
		
		// Bind DOM event handlers
		$(document)
			.keydown(input_key_down)
			.keyup(input_key_up);
		
		$(window).resize(resize);
		
		// Add screen canvas to DOM
		el_content.html(screen_e);
		resize();
		
		// Start doing stuff
		screen_ctx.fillStyle = "#fff";
		screen_ctx.font = "bold 12px 'Bitstream Vera Sans','Tahoma','sans'";
		screen_ctx.textBaseline = "middle";
		screen_ctx.textAlign = "center";
		
		Resources.load_resources(
			"game",
			function() {
				screen_ctx.clearRect(0, 0, screen.width, screen.height);
				screen_ctx.fillText("Initializing resources...", screen.width / 2, screen.height / 2);
				
				resmap = Resources.resmap;
				Resources.process_resources();
				
				screen_ctx.clearRect(0, 0, screen.width, screen.height);
				
				start_controller(Splash);
			},
			function(res, url) {
				screen_ctx.clearRect(0, 0, screen.width, screen.height);
				screen_ctx.fillText("Loading " + res.name + " (" + url + ")...", screen.width / 2, screen.height / 2);
			}
		);
		
		function frame() {
			if (controller && controller.frame) {
				Resources.frame();
				
				controller.frame();
				screen_ctx.drawImage(cv_root, 0, 0, screen.width, screen.height);
			}
			
			setTimeout(frame, 1000/30);
		}
		
		frame();
	})();
});

