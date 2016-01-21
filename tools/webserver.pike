#!/usr/bin/env pike

// ============================================================================
// Minia - Local testing webserver
// https://frigolit.net/projects/minia/
// Licensed under the MIT license - See LICENSE for more information.
// ============================================================================

int listen_port = 23857;

mapping mimetypes = ([
	"html": "text/html",
	"css": "text/css",
	"js": "text/js",

	"png": "image/png",
	"jpg": "image/jpg",
	"gif": "image/gif",

	"json": "application/json",
]);

Protocols.HTTP.Server.Port port;

int main(int argc, array argv) {
	listen_port = (int)Getopt.find_option(argv, "p", "port", UNDEFINED, (string)listen_port);
	int bind_all = Getopt.find_option(argv, "b", "bind-all");

	string listen_address = (bind_all ? "0.0.0.0" : "127.0.0.1");

	cd(dirname(argv[0]));
	cd("..");

	write("Starting webserver on %s:%d...\n", listen_address, listen_port);
	port = Protocols.HTTP.Server.Port(cb_request, listen_port, listen_address);

	write("\n");
	write("All good to go! Point your browser to http://localhost:%d/ to play.\n", listen_port);
	return -1;
}

void cb_request(object req) {
	string path = combine_path(getcwd(), combine_path("/", req->not_query)[1..]);

	if (Stdio.is_dir(path)) {
		string p = combine_path(path, "index.html");

		if (Stdio.is_file(p)) {
			path = p;
		}
	}

	if (Stdio.is_file(path)) {
		req->response_and_finish(([
			"error": 200,
			"file": Stdio.File(path),
			"type": mimetypes[lower_case((path / ".")[-1])] || "application/octet-stream",
		]));
	}
	else {
		req->response_and_finish(([
			"error": 404,
			"data": "HTTP 404: File Not Found :(",
			"type": "text/plain",
		]));
	}
}
