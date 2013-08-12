#!/usr/bin/env pike

mapping tilemap = ([
	"\xFF\xFF\xFF": 0,
	"\x00\x00\x00": 1,
	"\x00\x00\xFF": 2,
	"\xFF\xFF\x00": 3,
	"\x9C\xB5\xCD": 4,
	"\xBD\xD4\xE9": 5,
	"\xFF\x80\x00": 6,
	"\xFF\x00\xFF": 7,
	"\x81\x9B\xB3": 8,
	"\x78\x56\x2A": 9,
	"\xFF\xFF\x80": 10,
	"\xAF\x98\x47": 11,
	"\x65\x65\x65": 12,
]);

constant path_src = "src/levels";
constant path_output = "game/levels.json";

int main(int argc, array argv) {
	cd(basename(argv[0]));
	
	mapping exportdata = ([
		"levels": ([ ]),
		"levelindex": ({ }),
	]);
	
	// Build levels
	array a = sort(get_dir(path_src));
	foreach (a, string n) {
		write("Processing level: %s\n", n);
		
		string p = combine_path(path_src, n);
		
		if (!Stdio.is_file(combine_path(p, "level.png"))) continue;
		
		Image.Image img = Image.ANY.decode(Stdio.read_file(combine_path(p, "level.png")));
		mapping m = Standards.JSON.decode(Stdio.read_file(combine_path(p, "settings.json")));
		
		int start_x;
		int start_y;
		array a_tiles = allocate(img->xsize(), allocate(img->ysize()));
		
		for (int y = 0; y < img->ysize(); y++) {
			for (int x = 0; x < img->xsize(); x++) {
				string c = (string)img->getpixel(x, y);
				
				if (c == "\xFF\x00\x00") {
					start_x = x;
					start_y = y;
					c = "\xFF\xFF\xFF";
				}
				
				if (!undefinedp(tilemap[c])) a_tiles[x][y] = tilemap[c];
				else {
					werror("WARNING: Unhandled tile data: %s\n", String.string2hex(c));
				}
			}
		}
		
		// Initial values
		mapping r = ([
			"title": "",
		]);
		
		// Merge with level settings
		r += m;
		
		// Merge with level data
		r += ([
			"width": img->xsize(),
			"height": img->ysize(),
			"startpos": ({ start_x, start_y }),
			"tiles_json": Standards.JSON.encode(a_tiles, Standards.JSON.ASCII_ONLY),
		]);
		
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
		if (!level->next_level) errors += ({ ({ n, "next_level_missing" }) });
		else if (!exportdata->levels[level->next_level]) errors += ({ ({ n, "next_level_broken", level->next_level }) });
		
		if (level->exits) {
			foreach (level->exits; string ec; string et) {
				if (!exportdata->levels[et]) errors += ({ ({ n, "exit_broken", ec, et }) });
			}
		}
	}
	
	if (sizeof(errors)) {
		write("ERROR: Link verification failed\n");
		
		foreach (errors, array e) {
			write("  [%s] ", e[0]);
			
			switch (e[1]) {
				case "next_level_missing":
					write("No value specified for next_level");
					break;
					
				case "next_level_broken":
					write("Invalid target for next_level: %s", e[2]);
					break;
				
				case "exit_broken":
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
	Stdio.write_file(path_output, Standards.JSON.encode(exportdata, Standards.JSON.ASCII_ONLY | Standards.JSON.PIKE_CANONICAL));
}

