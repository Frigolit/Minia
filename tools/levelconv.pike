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

int main(int argc, array argv) {
	if (argc < 2) {
		werror("Usage: %s <folder>\n", argv[0]);
		return 1;
	}
	
	array a = Getopt.get_args(argv)[1..];
	foreach (sort(get_dir(a[0])), string n) {
		string p = combine_path(a[0], n);
		
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
					werror("Warning: Unhandled tile data: %s\n", String.string2hex(c));
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
			"tiles": a_tiles,
		]);
		
		// Write JSON
		Stdio.write_file(p + ".json", Standards.JSON.encode(r));
		
		write("Exported level: %s [%s]\n", basename(p), r->title);
	}
}

