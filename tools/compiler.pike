#!/usr/bin/env pike

// ============================================================================
// Minia - Game data compiler
// http://frigolit.net/projects/minia/
// ============================================================================

/*
Copyright (C) 2013-2016 Pontus "Frigolit" Rodling

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
*/

#define LAYER_INVISIBLE		0x02
#define LAYER_GROUP			0x10

mapping tilefile;
mapping tile_colormap = ([ ]);

constant path_level_src = "src/levels";
constant path_level_output = "game/levels.json";

constant path_tiles_src = "src/gfx/tiles.psd";
constant path_tiles_output = "game/tiles.json";

int main(int argc, array argv) {
	cd(dirname(argv[0]));
	cd("..");
	
	// Build stuff
	int r;
	
	if (r = build_tiles()) return r;
	if (r = build_levels()) return r;
	
	return 0;
}

int build_tiles() {
	write("Building tileset...\n");
	array psd = psd_parse(Stdio.read_file(path_tiles_src));
	mapping data = ([
		"tilemap": ([ ]),
		"index": ({ "" }),
	]);
	
	foreach (psd, mapping layer) {
		if (layer->name[0] == '#') continue;
		
		string name = (layer->name / ";")[0];
		
		string opt_color;
		int opt_flags;
		
		// Parse options if any
		if (glob("*;*", layer->name)) {
			array opts = (layer->name / ";")[1] / ",";
			foreach (opts, string a) {
				if (glob("c=*", a)) {
					opt_color = (a / "=")[1];
				}
				else if (a == "b") opt_flags |= 0x01;	// Block
				else if (a == "h") opt_flags |= 0x02;	// Hurt
			}
		}
		
		// Does the tile have a color? Map it to its index.
		if (opt_color) tile_colormap[String.hex2string(opt_color)] = sizeof(data->index);
		
		Image.Image image = layer->image;
		Image.Image alpha = layer->alpha;
		
		int x = layer->x;
		int y = layer->y;
		int w = image->xsize();
		int h = image->ysize();
		
		// Create alpha channel if missing
		if (!alpha) alpha = Image.Image(255, 255, 255, w, h);
		
		// Fix incorrect tile position/size due to transparent pixels, if any
		if (w != 8 || h != 8) {
			if (x % 8 || y % 8) {
				// Adjust position to grid
				
				int nx = x - x % 8;
				int ny = y - y % 8;
				
				int dx = nx - x;
				int dy = ny - y;
				image = image->copy(dx, dy, w - 1, h - 1, 0, 0, 0);
				alpha = alpha->copy(dx, dy, w - 1, h - 1, 0, 0, 0);
				
				x = nx;
				y = ny;
				w = image->xsize();
				h = image->ysize();
			}
			
			if (w != 8 || h != 8) {
				// Adjust size
				
				int dw = 8 - w;
				int dh = 8 - h;
				
				image = image->copy(0, 0, w - 1 + dw, h - 1 + dh);
				alpha = alpha->copy(0, 0, w - 1 + dw, h - 1 + dh);
				
				w = image->xsize();
				h = image->ysize();
			}
		}
		
		// Add tile
		data->tilemap[name] = ([
			"index": sizeof(data->index),
			"png": "data:image/png;base64," + MIME.encode_base64(Image.PNG.encode(image, ([ "alpha": alpha ])), 1),
			"flags": opt_flags,
		]);
		
		data->index += ({ name });
	}
	
	tilefile = data;
	
	Stdio.write_file(path_tiles_output, Standards.JSON.encode(data, Standards.JSON.ASCII_ONLY | Standards.JSON.PIKE_CANONICAL));
	return 0;
}

int build_levels() {
	mapping exportdata = ([
		"levels": ([ ]),
		"levelindex": ({ }),
	]);
	
	array a = sort(get_dir(path_level_src));
	foreach (a, string n) {
		string p = combine_path(path_level_src, n);
		mapping r;
		
		if (Stdio.is_file(combine_path(p, "level.psd"))) {
			r = export_level(p);
			if (!r) return 1;
		}
		else continue;
		
		// Add thumbnail if available (PNG/JPG/GIF)
		if (Stdio.is_file(combine_path(p, "thumbnail.png"))) {
			r["thumbnail"] = "data:image/png;base64," + MIME.encode_base64(Stdio.read_file(combine_path(p, "thumbnail.png")), 1);
		}
		else if (Stdio.is_file(combine_path(p, "thumbnail.jpg"))) {
			r["thumbnail"] = "data:image/jpeg;base64," + MIME.encode_base64(Stdio.read_file(combine_path(p, "thumbnail.jpg")), 1);
		}
		else if (Stdio.is_file(combine_path(p, "thumbnail.gif"))) {
			r["thumbnail"] = "data:image/gif;base64," + MIME.encode_base64(Stdio.read_file(combine_path(p, "thumbnail.gif")), 1);
		}
		
		// Add to result
		exportdata->levels[n] = r;
	}
	
	// Verify level links
	array errors = ({ });
	foreach (exportdata->levels; string n; mapping level) {
		foreach (level->exits, mapping e) {
			if (!exportdata->levels[e->target]) errors += ({ ({ n, "exit_target_missing", e->x + ", " + e->y, e->target }) });
		}
	}
	
	if (sizeof(errors)) {
		write("ERROR: Link verification failed\n");
		
		foreach (errors, array e) {
			write("  [%s] ", e[0]);
			
			switch (e[1]) {
				case "exit_target_missing":
					write("Invalid target for exit at (%s): %s", e[2], e[3]);
					break;
					
				default:
					write("Unhandled error code %O", e[1]);
			}
			
			write("\n");
		}
		
		return 1;
	}
	
	// Build level index
	function f_index = lambda(string n) { return exportdata->levels[n]->index; };
	a = filter(indices(exportdata->levels), f_index);
	sort(map(a, f_index), a);
	foreach (a, string n) {
		exportdata->levelindex += ({ n });
	}
	
	// Write target file
	Stdio.write_file(path_level_output, Standards.JSON.encode(exportdata, Standards.JSON.ASCII_ONLY | Standards.JSON.PIKE_CANONICAL));
	
	return 0;
}

mapping export_level(string p) {
	write("Processing level: %s\n", basename(p));
	
	array psd = psd_parse(Stdio.read_file(combine_path(p, "level.psd")));
	
	array entities = ({ });
	array exits = ({ });
	
	array tilelayers = ({ });
	
	foreach (psd, mapping a) {
		if (a->name[0] == '#') continue;
		
		if (a->name == "layers") {
			if (a->type != "group") {
				werror("** ERROR: Layer \"layers\" expected to be a group.\n");
				return UNDEFINED;
			}
			
			tilelayers = filter(a->children, lambda(mapping m) { return m->name[0] != '#'; });
		}
		else if (a->name == "exits") {
			if (a->type != "group") {
				werror("** ERROR: Layer \"exits\" expected to be a group.\n");
				return UNDEFINED;
			}
			
			foreach (a->children, mapping b) {
				array x = b->name / ",";
				
				string target = x[0];
				array flags = sizeof(x) > 1 ? x[1..] : ({ });
				
				exits += ({ ([ "target": target, "x": b->x, "y": b->y, "flags": flags ]) });
			}
		}
		else if (a->name == "entities") {
			if (a->type != "group") {
				werror("** ERROR: Layer \"entities\" expected to be a group.\n");
				return UNDEFINED;
			}
			
			foreach (a->children, mapping b) {
				entities += ({ ([ "type": b->name, "x": b->x, "y": b->y ]) });
			}
		}
		else werror("** WARNING: Unhandled layer \"%s\" - Ignoring...\n", a->name);
	}
	
	if (!~search(tilelayers->name, "main")) {
		werror("** ERROR: Missing required tile layer \"main\".\n");
		return UNDEFINED;
	}
	
	if (!sizeof(exits)) {
		werror("** WARNING: Level doesn't contain any exits.\n");
	}
	
	if (!~search(entities->type, "player")) {
		werror("** ERROR: Missing required entity \"player\".\n");
		return UNDEFINED;
	}
	
	int minx = tilelayers[0]->x;
	int miny = tilelayers[0]->y;
	int minw = tilelayers[0]->image->xsize() - tilelayers[0]->x;
	int minh = tilelayers[0]->image->ysize() - tilelayers[0]->y;
	
	foreach (tilelayers[1..], mapping t) {
		int w = t->image->xsize();
		int h = t->image->ysize();
		
		if (t->x < minx) minx = t->x;
		if (t->y < miny) miny = t->y;
		
		if (w - minx > minw) minw = w - minx;
		if (h - miny > minh) minh = h - miny;
	}
	
	foreach (entities, mapping e) {
		e->x -= minx;
		e->y -= miny;
	}
	
	foreach (exits, mapping e) {
		e->x -= minx;
		e->y -= miny;
	}
	
	int levelw = minw;
	int levelh = minh;
	
	mapping layers = ([ ]);
	foreach (tilelayers, mapping t) {
		if (t->name == "area") continue;	// The "area" layer is a special layer to get proper level bounds - Ignore it
		
		write("** INFO: Building layer: %s\n", t->name);
		
		array tiles = allocate(minw, allocate(minh, 0));
		
		// Base layer coordinates
		int rx = t->x - minx;
		int ry = t->y - miny;
		
		Image.Image img = t->image;
		Image.Image alpha = t->alpha;
		
		int w = t->image->xsize();
		int h = t->image->ysize();
		
		// Build it!
		for (int y = 0; y < h; y++) {
			for (int x = 0; x < w; x++) {
				// Transparent pixels means empty tile, so just continue the loop
				if (alpha && alpha->getpixel(x, y)[0] < 128) continue;
				
				// Map color to tile
				int|void c = tile_colormap[(string)img->getpixel(x, y)];
				
				// Handle missing color-mappings
				if (undefinedp(c)) {
					werror("** ERROR: Unknown tile color #%s at (%d,%d).\n", upper_case(String.string2hex((string)img->getpixel(x, y))), x + rx, y + ry);
					return UNDEFINED;
				}
				
				// :3
				tiles[x + rx][y + ry] = c;
			}
		}
		
		layers[t->name] = tiles;
	}
	
	mapping r = ([
		"title": "Untitled",
	]);
	
	string p_settings = combine_path(p, "settings.json");
	if (Stdio.is_file(p_settings)) {
		r += Standards.JSON.decode(Stdio.read_file(p_settings));
	}
	
	return r + ([
		"width": levelw,
		"height": levelh,
		
		"entities": entities,
		"exits": exits,
		"layers": layers,
	]);
}

array psd_parse(string data) {
	mapping m = Image.PSD.__decode(data);
	
	array layers = ({ });
	array r = ({ });
	array depth = ({ });
	
	mapping g;
	
	foreach (m->layers, object l) {
		if (l->flags & LAYER_GROUP) {
			if (l->name == "</Layer group>") {
				depth = depth[0..<1];
				if (!sizeof(depth)) g = UNDEFINED;
				continue;
			}
			
			mapping m = ([
				"name":     l->name,
				"type":     "group",
				"visible":  !(l->flags & LAYER_INVISIBLE),
				"children": ({ }),
			]);
			
			if (sizeof(depth)) g->children += ({ m });
			else r += ({ m });
			
			g = m;
			depth += ({ m });
		}
		else {
			mapping m = ([
				"name":    l->name,
				"type":    "layer",
				"visible": !(l->flags & LAYER_INVISIBLE),
				
				"image":   l->image,
				"alpha":   l->alpha,
				
				"x":       l->xoffset,
				"y":       l->yoffset,
			]);
			
			if (g) g->children += ({ m });
			else r += ({ m });
			
			layers += ({ m });
		}
	}
	
	return r;
}

