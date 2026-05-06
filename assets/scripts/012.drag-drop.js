var TF_request_total_size = 0

,TF_request_loaded_size = 0

,TF_request_errors = {};

TF_request_errors.ext = [];

TF_request_errors.size = [];

$.fn.TF_drag_drop = function(localOptions, remoteOptions) {

	// Compatibility check
	if ((typeof XMLHttpRequest == "undefined") ||
		(typeof document.addEventListener == "undefined") ||
		(typeof File == "undefined") ||
		(typeof FileReader  == "undefined")
	)
	return;
	
	// Default options about local files drag & drop
	var lo = {

		// URL to upload handler script
		url: "",

		// File field name
		param: "upload",

		// Maximum filesize in bytes. If a dragged file is too big, the browser crashes
		maxFilesize: 10485760000, // (client taraflı kontrolden sonra lüzumsuz)

		// Called before all uploads. Useful for implementing some checks before uploads begins
		// If it returns false, the uploading will be canceled.
		precheck: function(evt) {
			console.log("Upload process started");
			return true;
		},

		// Called when an upload begins
		begin: function(xhr, currentFile, filesCount) {
			console.log("Uploading file " + currentFile + " of " + filesCount + " (" + xhr.file.name + ")");
		},

		// Called after successful upload request
		success: function(xhr, currentFile, filesCount) {
			console.log("Upload success (" + xhr.file.name + ")");
		},

		// Called when an upload request fails
		error: function(xhr, currentFile, filesCount) {
			console.log("Upload request failed (" + xhr.file.name + ")");
		},

		// Called when an upload request is aborted
		abort: function(xhr, currentFile, filesCount) {
			console.log("Upload request aborted (" + xhr.file.name + ")");
		},

		// Called when a file exceeds the maxFilesize option
		filesizeCallback: function(xhr, currentFile, filesCount) {
			console.log("File is too big (" + xhr.file.name + ")");
		},

		// Called when all files are proceeded
		finish: function(files) {
			console.log("Upload process finished");
		},
		
		// tinyfinder upload type
		tf_type: '',
		
		// tinyfinder obj
		tf_obj: null
	},

	// Default options about HTML objects drag & drop
	ro = {

		// If a selection is dropped you could to fetch multiple URLs from selected HTML
		// You can define the selectors URLs will be fetched from. If you want only images
		// leave 'img[src]' only
		selectors: 'img[src]',
		//selectors: 'img[src], a[href], script[src], link[href]',

		// Check URLs for uniqueness
		unique: true,

		// Ajax options
		ajax: {
			url: "",
			type: "post",
			dataType: "json",
			data: {
				url: "{url}",  // {url} marks the URL from dragged object
				type: "{type}", // {type} marks the tag type ("a" or "img")
				upload_options: "" // tinyfinder upload options
			},
			success: function(response) {
				console.log("URL has been passed to the server.");
			},
			error: function() {
				console.log("Request failed!");
			}
		}
	};

	$.extend(true, ro, remoteOptions);
	$.extend(true, lo, localOptions);
	
	/*
	if (!XMLHttpRequest.prototype.sendAsBinary) {
		XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
			var ords = Array.prototype.map.call(datastr, function(x) {
					return x.charCodeAt(0) & 0xff;
				}),
				ui8a = new Uint8Array(ords);
			this.send(ui8a);
		}
	}
	*/
	if (!XMLHttpRequest.prototype.sendAsBinary) {
		XMLHttpRequest.prototype.sendAsBinary = function(sData) {
			var nBytes = sData.length, ui8Data = new Uint8Array(nBytes);
			for (var nIdx = 0; nIdx < nBytes; nIdx++) {
				ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
			}
			/* send as ArrayBufferView...: */
			this.send(ui8Data);
			/* ...or as ArrayBuffer (legacy)...: this.send(ui8Data.buffer); */
		};
	}
	
	$(this).each(function() {
		var t = this,
			uploadQueue = [],
			uploadInProgress = false,
			filesCount = 0,
			boundary = "------multipartdropuploadboundary" + new Date().getTime(),
			currentFile,

		dragOver = function(e) {
			if (e.preventDefault) e.preventDefault();
			$(t).addClass('drag');
			$('.TF_searchresults > ul').addClass('list_drag');
			return false;
		},

		dragEnter = function(e) {
			if (e.preventDefault) e.preventDefault();
			return false;
		},

		dragLeave = function(e) {
			if (e.preventDefault) e.preventDefault();
			$(t).removeClass('drag');
			$('.TF_searchresults > ul').removeClass('list_drag');
			return false;
		},
		
		// img preview (during the installation)
		tf_read_image = function(file)
		{
			var ext = file.name.split('.').pop().toLowerCase()
			,reader_instance = new FileReader();
			if (['jpg','jpeg','png','gif','png'].indexOf(ext) > -1)
			{
				reader_instance.readAsDataURL(file);
				reader_instance.onload = function(e) {
					$("#TF_fm_preview_container").html('<img src="'+e.target.result+'" class="TF_fm_preview onprogress" />');
				};
			}
		},

		drop = function(e)
		{
			if ($(t).data('upload_progress')) {
				e.preventDefault();
				return false;
			}
			
			if (e.preventDefault) e.preventDefault();
			if (e.stopPropagation) e.stopPropagation();
			
			$(t).removeClass('drag');
			$('.TF_searchresults > ul').addClass('list_drag');
			
			try {
				var el = e.dataTransfer.getData('text/html');
			} catch (e) {
				var el = false;
			}

			// Remote drop
			if (el) {

				if (!remoteOptions || lo.tf_type != 'img')
				{
					bootbox.alert(nit.str('alert_remote-drop-for-image-upload'));
					return false;
				}
				
				el = '<div>' + el.toString() + '</div>';
				var urls = [], types = [];

				var selectors = $.isArray(ro.selectors)
					? ro.selectors
					: ro.selectors.split(/\s*,\s*/g);

				$.each(selectors, function(i, selector) {
					if (!/^[a-z0-9]+\[[a-z]+\]$/gi.test(selector))
						return true;
					var type = selector.split('[')[0],
						attr = selector.split('[')[1].split(']')[0];
					$(el).find(selector).each(function() {
						var url = $(this).attr(attr);
						if (ro.unique)
							for (var i = 0; i < urls.length; i++)
								if ((urls[i] == url) && (types[i] == type))
									return true;
						urls.push(url);
						types.push(type);
					});
				});

				if (!urls.length)
				{
					bootbox.alert(nit.str('alert_remote-drop-select-image'));
					$('.TF_searchresults > ul').removeClass('list_drag');
					return false;
				}
				
				nit.blockloader($(".bootbox .modal-dialog"));

				if (urls.length == 1) {
					urls = urls[0];
					types = types[0];
				}

				var opts = $.extend(true, {}, ro.ajax);
				if (opts.data) {
					$.each(opts.data, function(i, j) {
						if (j == "{url}")
							opts.data[i] = urls;
						if (j == "{type}")
							opts.data[i] = types;
					});
				}
				opts.data.upload_options = lo.tf_obj.data('TF_'+lo.tf_type+'_upload_options');
				$.ajax(opts);

			}
			
			else // Local drop
			{
				if (!localOptions)
					return false;

				filesCount += e.dataTransfer.files.length;

				if (!filesCount || !lo.precheck(e))
					return false;
				
				if (lo.tf_type == 'img' && filesCount == 1)
				{
					tf_read_image(e.dataTransfer.files[0]);
				}

				for (var i = 0; i < filesCount; i++)
				{
					var file = e.dataTransfer.files[i]
					
					, ext = file.name.split('.').pop().toLowerCase()
					, has_error = false
					, allowed_extensions = []
					, allowed_size = 0;
											
					if (lo.tf_type == 'img')
					{
						allowed_extensions = ['jpg','jpeg','png','gif','png'];
						allowed_size = tf_dyn.cnf.max_img_size;
					}
					else if (lo.tf_type == 'file')
					{
						allowed_extensions = tf_dyn.cnf.file_extensions;
						allowed_size = tf_dyn.cnf.max_file_size;
					}
					
					if (allowed_extensions.indexOf(ext) == -1)
					{
						TF_request_errors.ext.push(file.name);
						has_error = true;
					}
					else if (file.size > allowed_size)
					{
						TF_request_errors.size.push(file.name+" ~ "+roundfilesize(file.size));
						has_error = true;
					}
					
					if (!has_error)
					{
//						log(file.name+" ~ "+file.size);
						TF_request_total_size += file.size;
						uploadQueue.push(file);
					}
					else
					{
						has_error = false;
					}

				}
				
				uploadNext();
			}

			return false;
		},
		
		handle_current_item = '',
		handle_last_progressing_item = '',
		handle_last_progressing_loaded = 0,
		
		// general progress bar
		tf_general_progress = function()
		{
			var val = Math.round(TF_request_loaded_size/TF_request_total_size*100);
			$('#TF_progress .progress-bar').css({width: val+"%"})
			.attr('aria-valuenow', val)
			.html('<span>'+roundfilesize(TF_request_loaded_size)+' of '+roundfilesize(TF_request_total_size)+'</span>');
		},
		
		// item progress bar
		tf_item_progress = function(e)
		{
			var progress = e.lengthComputable
				? Math.round(e.loaded / e.total * 100) + '%'
				: roundfilesize(e.loaded);
			
			// ,num = filesCount - uploadQueue.length;

			if (!handle_last_progressing_item || (handle_current_item!=handle_last_progressing_item && e.loaded<=e.total))
			{
				TF_request_loaded_size += e.loaded;
			}
			else if (handle_current_item==handle_last_progressing_item && e.loaded<=e.total)
			{
				TF_request_loaded_size += (e.loaded-handle_last_progressing_loaded);
			}

			tf_general_progress();
			
			handle_last_progressing_item = handle_current_item;
			handle_last_progressing_loaded = e.loaded;
			
			if (!e.lengthComputable)
			{
				// ["+num+"/"+filesCount+"]
				$('#TF_item_progress .progress-bar').html("<span>["+progress+"] "+handle_current_item+"</span>")
				.css({width: "100%"})
				.attr('aria-valuenow', 100);
			}
			else
			{
				var val = Math.round(parseInt(progress));
				$('#TF_item_progress .progress-bar').html("<span>["+progress+"] "+handle_current_item+"</span>")
				.css({width: val+"%"})
				.attr('aria-valuenow', val);
			}
		},
		
		uploadNext = function() {
			if (uploadInProgress)
				return false;

			if (uploadQueue && uploadQueue.length) {

				var file = uploadQueue.shift(),
					currentNum = filesCount - uploadQueue.length,
					reader = new FileReader(),
					ie = (typeof reader.readAsBinaryString == "undefined");
					
				currentFile = reader.file = file;

				reader.onerror = function(evt) {
					evt.file = file;
					lo.error(evt, currentNum, filesCount);
					uploadNext();
				};

				reader.onload = function(evt) {
					uploadInProgress = true;

					var xhr = new XMLHttpRequest(),
					postbody = '--' + boundary + '\r\nContent-Disposition: form-data; name="' + lo.param + '"';

					xhr.file = evt.target.file;

					lo.begin(xhr, currentNum, filesCount);

					if (lo.maxFilesize && (xhr.file.size > lo.maxFilesize)) {
						uploadInProgress = false;
						lo.filesizeCallback(xhr, currentNum, filesCount);
						uploadNext();
						return;
					}
					
					if (ie) {
						var binary = "",
							bytes = new Uint8Array(evt.target.result);

						for (var i = 0; i < bytes.byteLength; i++)
							binary += String.fromCharCode(bytes[i]);
					}
					
					if (xhr.file.name)
					{
						postbody += '; filename="' + utf8encode(xhr.file.name) + '"';
					}
					postbody += '\r\n';
					if (xhr.file.size)
						postbody += "Content-Length: " + xhr.file.size + "\r\n";
					postbody += "Content-Type: " + xhr.file.type + "\r\n\r\n" + (ie ? binary : evt.target.result) + "\r\n--" + boundary + "--\r\n";
					
					if (xhr.upload)
					{
						handle_current_item = xhr.file.name;
						xhr.upload.addEventListener('progress', tf_item_progress, false);
					}
					
					xhr.open('post', lo.url+"&upload_options="+lo.tf_obj.data('TF_'+lo.tf_type+'_upload_options'), true);
					xhr.setRequestHeader('Content-Type', "multipart/form-data; boundary=" + boundary);
					
					xhr.onload = function() {
						uploadInProgress = false;
						lo.success(xhr, currentNum, filesCount);
						uploadNext();
					};

					xhr.onerror = function() {
						uploadInProgress = false;
						lo.error(xhr, currentNum, filesCount);
						uploadNext();
					};

					xhr.onabort = function() {
						uploadInProgress = false;
						lo.abort(xhr, currentNum, filesCount);
						uploadNext();
					};

					xhr.sendAsBinary(postbody);
				};

				if (ie)
					reader.readAsArrayBuffer(file);
				else
					reader.readAsBinaryString(file);

			} else {
				filesCount_h = filesCount;
				filesCount = 0;
				var loop = setInterval(function() {
					if (uploadInProgress) return;
					boundary = "------multipartdropuploadboundary" + new Date().getTime();
					uploadQueue = [];
					clearInterval(loop);
					lo.finish(filesCount_h);
				}, 333);
			}
		};

		if (!$(t).data('shdu'))
			$(t).data('shdu', {
				dragover: dragOver,
				dragenter: dragEnter,
				dragLeave: dragLeave,
				drop: drop
			});

		var bind = function(event, callback) {
			t.removeEventListener(event, $(t).data('shdu')[event], false);
			var data = $(t).data('shdu'),
				newData = {};
			newData[event] = callback;
			$.extend(data, newData);
			$(t).data('shdu', data);
			t.addEventListener(event, callback, false);
		};
		
		bind('dragover', dragOver);
		bind('dragenter', dragEnter);
		bind('dragleave', dragLeave);
		bind('drop', drop);
		
		var inputfile = $(t).next('input.TF_uploadingfile');
		if (inputfile.length)
		{
			$(t).click(function() {
				if (!$(this).hasClass('cwait'))
				{
					inputfile.click();
				}
			});
			inputfile.change(function() {
				var inp = $(this)[0];
				filesCount = inp.files.length;

				if (!filesCount || !lo.precheck())
					return false;

				if (lo.tf_type == 'img' && filesCount == 1)
				{
					tf_read_image(inp.files.item(0));
				}

				for (var i = 0; i < filesCount; ++i)
				{
					var file = inp.files.item(i)

					, ext = file.name.split('.').pop().toLowerCase()
					, has_error = false
					, allowed_extensions = []
					, allowed_size = 0;

					if (lo.tf_type == 'img')
					{
						allowed_extensions = ['jpg','jpeg','png','gif','png'];
						allowed_size = tf_dyn.cnf.max_img_size;
					}
					else if (lo.tf_type == 'file')
					{
						allowed_extensions = tf_dyn.cnf.file_extensions;
						allowed_size = tf_dyn.cnf.max_file_size;
					}
					
					if (allowed_extensions.indexOf(ext) == -1)
					{
						TF_request_errors.ext.push(file.name);
						has_error = true;
					}
					else if (file.size > allowed_size)
					{
						TF_request_errors.size.push(file.name+" ~ "+roundfilesize(file.size));
						has_error = true;
					}

					if (!has_error)
					{
						// log(file.name+" ~ "+file.size);
						TF_request_total_size += file.size;
						uploadQueue.push(file);
					}
					else
					{
						has_error = false;
					}

				}

				uploadNext();

			});
		}

		
	});
};