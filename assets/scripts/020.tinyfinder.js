$.extend({
	TF_defaults : function() {
		nit.init();
		return {
			
			release : 'v1.6-RC2',
			
			type : 'img', // or file, img_edit
			
			url  : {
				assets : nit.app_url+'assets/',
				uploadDir : nit.app_url+'uploads/',
				serverside : {
					main: nit.app_url+'file/manager/',
					get_filename: nit.app_url+'file/manager/name',
					upload : nit.app_url+'file/upload/',
					download : nit.app_url+'file/download/',
					check4update : nit.app_url+'file/manager/check4update?package=none'
				}
			},
			
			buttons : {
				archive : true,
				download : false,
				cancel : false
			},
			
			create_thumb : true,
			
			private_file : false,
			
			/* 0-No resize
			   1-Standard resizing.
			   2-Resize; but keep aspect ratio.
			   3-Resize; crop image from center.
			   4-Resize; keep ratio and fill blanks for desired dimensions. */
			resize_type : 0,
			width : null,
			height : null,
			
			rte : {
				_obj  : null,
				type : '',
				hideAfterImgSelect : true,
				thumbSelect : true
			},
			
			img_edit_params: {
				width : 128,
				height : 128,
				callback  : null
			},
			
			// "file" upload options
			add_to_zip : false,
			del_zipped_files : true,
			//
			
			common_exts : ['gz','zip','rar','txt','pdf','doc','docx','xls','xlsx','ppt','pps','pptx','psd','mp3','mp4']
		};
	},
	
	TF_filemanager : function(vars, obj)
	{
		var self = this,
		options = vars;

		if (vars.rte._obj)
		{
			options = nit.extendObj(self.TF_defaults(), vars);
		}
		
		self.extend(
		{
			TF_preview : function (basename, name, id)
			{
				var el = {}, size, width, height
				,ext = basename.split('.').pop().toLowerCase()
				,isimg = (ext == "gif" || ext == "jpg" || ext == "png")
				,ismedia = (ext == "swf" || ext == "mp3" || ext == "mp4");

				if (isimg) el = new Image;
				el.src = options.url.uploadDir+options.type+"/"+basename;
				
				if (isempty(basename) || httpstatus(el.src)==404)
				{
					var is_file_not_found = true;
					
					$(".TF_fm_selectbut").addClass('selection-disabled onprogress');
					el.src = options.url.assets+'images/imgedit_404.png';
					ext = 'png';
					isimg = true;
					
//					$("li[fileid="+id+"] i:visible").filter(function(){
//						return [0,2,3].indexOf(i) > -1;
//					})
					$("li[fileid="+id+"] i:visible").filter('.fileLink, .resizeimg, .crop, .compress')
					.addClass('file-not-found');
				}
				else
				{
					$(".TF_fm_selectbut").removeClass('selection-disabled onprogress');
				}

				if (isimg || ismedia)
				{
					$("#TF_fm_preview_container").html(showfile(el.src, null, null, "TF_fm_preview shadow1"));
					
					if (isimg)
					{
						$("#TF_fm_preview_container img").wrap('<a title="'+nit.str('text_download')+'" href="'+options.url.serverside.download+'?basename='+basename+'"></a>');
					}
						
					if (ext == 'mp4')
					{
						$("#TF_fm_preview_container video").bind("loadedmetadata", function () {
							width = this.videoWidth;
							height = this.videoHeight;
						});
					}
				}
				else
				{
					if (options.common_exts.indexOf(ext) > -1)
					{
						$("#TF_fm_preview_container").html("<a title='"+nit.str('text_download')+"' href='"+options.url.serverside.download+"?basename="+basename+"'>"+showfile(options.url.assets+"images/format_"+ext+".png", 192, 192, "TF_fm_preview shadow1",1)+"</a>");
					}
					else
					{
						$("#TF_fm_preview_container").html("<a title='"+nit.str('text_download')+"' class='p_relative' href='"+options.url.serverside.download+"?basename="+basename+"'>"+showfile(options.url.assets+"images/format_other.png", ((ext.length>5)?256:224), ((ext.length>5)?256:224), "TF_fm_preview",1)+"<span class='ext'>"+ext.toUpperCase()+"</span></a>");
					}
					
				}
				
				if (!ismedia && $("li[fileid="+id+"]").data("isprivate") === 'Yes')
				{
					$("#TF_fm_preview_container").append('<span class="property"><i class="fa fa-user" /> '+nit.str('text_private')+'</span>');
					var owidth = -$("#TF_fm_preview_container span.property").outerWidth();
					$("#TF_fm_preview_container span.property").css('margin-left', owidth);
				}

				$(".TF_fm_selectbut").unbind("click"); //.addClass("cwait");

				size = $("li[fileid="+id+"]").data("size");

				if (is_file_not_found)
				{
					$("#previewlegend span").html(nit.str('text_file-not-found'));
				}
				else if (isimg || ext == "swf")
				{
					width = $("li[fileid="+id+"]").data("width");
					height = $("li[fileid="+id+"]").data("height");
					$("#previewlegend span").html(width+"x"+height+" ~ "+size);
				}
				else
				{
					$("#previewlegend span").html(ext+" ~ "+size);
				}
				//  pdf
				var fa_file_icons = {
					'png' : 'fa-image',
					'jpg' : 'fa-image',
					'gif' : 'fa-image',
					'swf' : 'fa-image',
					'rar' : 'fa-file-archive-o',
					'zip' : 'fa-file-archive-o',
					'xls' : 'fa-file-excel-o',
					'xlsx' : 'fa-file-excel-o',
					'txt' : 'fa-file-text-o',
					'pdf' : 'fa-file-pdf-o',
					'doc' : 'fa-file-word-o',
					'docx' : 'fa-file-word-o',
					'ppt' : 'fa-file-powerpoint-o',
					'pptx' : 'fa-file-powerpoint-o',
					'mp3' : 'fa-file-audio-o',
					'mp4' : 'fa-file-movie-o'
				};
				
				$("#previewlegend i").show()
				.attr("class", "fa "+(fa_file_icons[ext] || 'fa-file-o'));

				if (!options.rte._obj)
				{
					$(".TF_fm_selectbut:not(.selection-disabled)").click(function() {
						if (!$('.TF_searchresults .tc-item.item-active').length)
						{
							bootbox.alert(nit.str('alert_not-selected-file'));
							return;
						}
						
						obj.popover('destroy')
						.val(name).next().val(basename);
				
						setTimeout(function() {
							if (isimg || ext == "swf") {
								obj.popover({
									content : showfile(options.url.uploadDir+options.type+"/"+basename,((width>250)?250:width),null,'uploadedimg'),
									html:true
								});
							}
							else if (options.common_exts.indexOf(ext) > -1) {
								obj.popover({
									content : showfile(options.url.assets+"images/format_"+ext+".png", 96, 96, "TF_fm_preview"),
									html:true
								});
							}
							else {
								obj.popover({
									content : '<div class="p_relative">'+
										showfile(options.url.assets+"images/format_other.png", 96, 96, "TF_fm_preview")+
										'<span class="ext_popover">'+ext.toUpperCase()+'</span>'+
									'</div>',
									html:true
								});
							}
							
						},500);
						
						nit.hideallmodals();

					});
				}

				else // RTE blok
				{
					
					$(".TF_fm_selectbut:not(.selection-disabled)").click(function()
					{
						if (!$('.TF_searchresults .tc-item.item-active').length)
						{
							bootbox.alert(nit.str('alert_not-selected-file'));
							return;
						}
						var selectbut = $(this),
						RTE = options.rte._obj;
						switch (options.rte.type)
						{
							case "ckeditor":
								if (isimg)
								{
									var img = RTE.document.createElement('img');
									if (!selectbut.hasClass('thumb'))
									{
										img.setAttributes({
											src : options.url.uploadDir+'img/'+basename,
											style : "height:"+height+"px;width:"+width+"px",
											alt : substr_replace(name, '', name.lastIndexOf('.'), 5)
										});
									}
									else // thumb block
									{
										img.setAttributes({
											src : options.url.uploadDir+"img/"+selectbut.attr('folder')+'/'+basename,
											alt : substr_replace(name, '', name.lastIndexOf('.'), 5)
										});
									}
									RTE.insertElement(img);
								}
								else if (ext=="swf")
								{
									html = showfile(options.url.uploadDir+"file/"+basename, width, height);
									RTE.insertHtml(html);
								}
								else if (ext=="mp3")
								{
									var html = '<audio controls>'+
											'<source src="'+options.url.uploadDir+"file/"+basename+'" type="audio/mpeg">'+
										'</audio>';
									var realElement = CKEDITOR.dom.element.createFromHtml( html );
									var fakeElement = RTE.createFakeElement( realElement, 'cke_audio', 'audio', false );
									RTE.insertElement(fakeElement);
								}
								else if (ext=="mp4")
								{
									$.TF_autocomplete.deactivate();
									$('#TF_filetitle').attr('disabled','disabled');
									
									nit.blockloader($(".TF_filemanagerbox .modal-dialog"));
									
									setTimeout(function() {
										bootbox.dialog({
											closeButton: false,
											title: nit.str("text_video-options"),
											className: 'TF_dialog',
											message: ''+
												'<div class="row">  ' +
													'<div class="col-md-12"> ' +
														'<form class="form-horizontal TF_form"> ' +
															'<div class="form-group"> ' +
																'<label class="col-md-4 control-label">'+nit.str("text_width")+'</label> ' +
																'<div class="col-md-4"> ' +
																'<input value="'+(width || 640)+'" orig="'+(width || 640)+'" type="text" class="form-control TF_video_size TF_video_width" onkeypress="return forcenumber(event)"> ' +
																'</div> ' +
															'</div> ' +
															'<div class="form-group"> ' +
																'<label class="col-md-4 control-label">'+nit.str("text_height")+'</label> ' +
																'<div class="col-md-4"> ' +
																'<input readonly value="'+(height || 360)+'" orig="'+(height || 360)+'" type="text" class="form-control TF_video_size TF_video_height" onkeypress="return forcenumber(event)"> ' +
																'</div> ' +
															'</div> ' +
															'<div class="form-group"> ' +
																'<label class="col-md-4 control-label">'+nit.str("text_controls")+'</label> ' +
																'<div class="col-md-4"> ' +
																'<input class="TF_video_controls" type="checkbox" checked>' +
																'</div> ' +
															'</div> ' +
															'<div class="form-group"> ' +
																'<label class="col-md-4 control-label">'+nit.str("text_autoplay")+'</label> ' +
																'<div class="col-md-4"> ' +
																'<input class="TF_video_autoplay" type="checkbox" checked>' +
																'</div> ' +
															'</div> ' +
															'<div class="form-group"> ' +
																'<label class="col-md-4 control-label">'+nit.str("text_muted")+'</label> ' +
																'<div class="col-md-4"> ' +
																'<input class="TF_video_muted" type="checkbox">' +
																'</div> ' +
															'</div> ' +
														'</form>'+
													'</div>'+
												'</div>',
											buttons: {
												okay: {
													label: nit.str("button_add-video"),
													className: "btn-success",
													callback: function () {
														
														var yalanoldu = false;
														$('.TF_video_size').each(function() {
															if (!parseInt($(this).val())) {
																yalanoldu = true;
																$(this).addClass('notvalidfield').focus();
																return false;
															}
															else $(this).removeClass('notvalidfield');
														});
														if (yalanoldu) return false;
														
														var video_obj = RTE.document.createElement('video');
														video_obj.setAttributes({
															width : parseInt($('.TF_video_width').val()),
															height : parseInt($('.TF_video_height').val())
														});
														if ($('.TF_video_controls').prop('checked'))
														{
															video_obj.setAttribute('controls','');
														}
														if ($('.TF_video_autoplay').prop('checked'))
														{
															video_obj.setAttribute('autoplay','');
														}
														if ($('.TF_video_muted').prop('checked'))
														{
															video_obj.setAttribute('muted','');
														}
														
														video_obj.setHtml('<source src="'+options.url.uploadDir+"file/"+basename+'" type="video/mp4">');
														var fakeElement = RTE.createFakeElement( video_obj, 'cke_video', 'video', false );
														RTE.insertElement(fakeElement);
														
														video_obj.setHtml('');
														
														nit.hideallmodals();
													}
												},
												close: {
													label: nit.str("button_close"),
													className:"btn-danger",
													callback: function () {
														$('#TF_filetitle').removeAttr('disabled');
													}
												}
											}
										})
										.on('shown.bs.modal', function() {
											$(".TF_video_width").focus()
											.keyup(function() {
												if ($(this).val()>0) {
													$(this).val(parseFloat($(this).val()));
													var rate = parseInt($(this).attr("orig")) / parseInt($('.TF_video_height').attr("orig"));
													$('.TF_video_height').val(parseInt(parseInt($(this).val()) / rate));
												}
												else $('.TF_video_height').val(0);
											});
										});
										
										nit.hideblockloader($(".TF_filemanagerbox .modal-dialog"));
										
									}, 500);

								}
								else
								{
									var div = RTE.document.createElement('div');
									div.setHtml('<a href="'+options.url.serverside.download+'?basename='+basename+'">'+name+'</a>');
									RTE.insertElement(div);
								}
							break;

							case "tinymce":
								// bla bla..
							break;
						}
						
						if (ext!='mp4' && (options.type!='img' || options.rte.hideAfterImgSelect))
						{
							nit.hideallmodals();
						}
						
					});
					
					if (options.type=='img')
					{
						var cond = (options.rte.thumbSelect && $("li[fileid="+id+"]").data("hasthumb") == 'Yes')
						$('.TF_fm_selectbut.thumb').toggle(cond);
					}


				} // RTE blok 


			},
			
			TF_imgresize : function(fileid, width, height)
			{
				if (parseInt(width) < 16 || parseInt(height) < 16) {
					bootbox.alert(nit.str("alert_min-dimensions")+": 16x16");
					return;
				}
				var row = $("li[fileid="+fileid+"]");
				$("span.resize i", row).replaceWith('<i class="fa fa-refresh fa-spin">');
				$.getJSON(options.url.serverside.main+"resize?id="+fileid+"&dst_w="+width+"&dst_h="+height, function(resp) {
					if (!isempty(resp) && resp.code!=-1) {
						row.data({
							size : resp.size,
							width : parseInt(width),
							height : parseInt(height)
						});
					}
					$("span.resize", row).remove();
					$("span.filetitle", row).show().parent().click();
				});
			},

			TF_filemanagerResponse : function(msg)
			{
				nit.hideblockloader($(".bootbox .modal-dialog"));
				if (!isempty(msg))
				{
					this.TF_autocomplete.deactivate();
					bootbox.alert(msg, function(){
						$("#TF_fm_preview_container").html('');
						$.TF_autocomplete.run();
					});
				}
				else
				{
					this.TF_autocomplete.run();
				}
				$('.TF_uploadingfile').val('');
			}

		});


		
		function _remove(id)
		{
			var row = $("li[fileid="+id+"]");
			bootbox.confirm(nit.str("text_is-delete-file"), function(result){
				if (result)
				{
					row.addClass("removingitem");
					var next = row.next()
					,prev = row.prev();
					$.get(options.url.serverside.main+"remove?id="+id, function(response) {
						if (!trim(response))
						{
							row.tooltip('destroy').fadeOut(300, function() {
								row.remove();
								if (next.length) next.click();
								else if (prev.length) prev.click();
								else
								{
									$("#TF_filetitle").val('');
									$("#TF_fm_preview_container").html('');
									$(".TF_fm_selectbut").unbind('click');
								}
							});
						}
						else
						{
							bootbox.alert(response, function() { row.removeClass("removingitem"); });
						}
					});
				}
			});
		}
		
		nit.fullpageloader();
		
		$.get(options.url.serverside.main+"?type="+options.type, function(response) {

			response = response.replace('{upload_url}',options.url.serverside.upload);
			
			setTimeout(function()
			{
				nit.hideallmodals();
				bootbox.dialog({
					closeButton: false,
					message: response,
					className: 'TF_dialog TF_filemanagerbox'
				})
				.on('shown.bs.modal', function() {
					
					if (options.pre_alert)
					{
						bootbox.alert(base64_decode(options.pre_alert));
						options.pre_alert = '';
					}
					
					self.TF_upload_handler(options, ((obj)?obj:$(options.rte._obj)), options.url.serverside.upload+"?mode=archive&type="+options.type);
					
					self.extend({
						TF_autocomplete : $("#TF_filetitle").tinycomplete({
							minlen : 0,
							type : "list",
							requesturl : options.url.serverside.main+"filter?type="+options.type,
							template : '<li type="{type}" fileid="{id}" data-name="{name}" data-basename="{basename}" data-size="{size}" data-width="{width}" data-height="{height}" data-hasthumb="{hasthumb}" data-isprivate="{isprivate}" class="tooltips" title="<i>'+nit.str('text_uploader')+': {uploader}<br>'+nit.str('text_date')+': {timestamp}</i>">'
								+  '<span class="filetitle">{display_name}</span>'
								+  '<span class="tc-item-operations transicons">'
								+  '<i class="fa fa-link fileLink"></i>'
								+  '<i title="'+nit.str('text_rename')+'" class="fa fa-edit rename"></i>'
								+  '<a href="'+options.url.serverside.download+'?basename={basename}"><i title="'+nit.str('text_download')+'" class="fa fa-download downbut d_none"></i></a>'
								+  '<i title="'+nit.str('text_addtozip')+'" class="fa fa-file-archive-o compress d_none"></i>'
								+  '<i title="'+nit.str('text_resize')+'" class="fa fa-cog resizeimg d_none"></i>'
								+  '<i title="'+nit.str('text_crop-img')+'" class="fa fa-crop crop d_none"></i>'
								+  '<i title="Delete" class="fa fa-trash-o delete"></i>'
								+  '</span>'
								+  '</li>',
							callback : function()
							{
								$(".TF_searchresults .tc-item[type='img']").find(".crop,.resizeimg").removeClass("d_none");
								$(".TF_searchresults .tc-item[type='file']").find(".downbut,.compress").removeClass("d_none");


								$(".TF_searchresults .tc-item").tooltip('destroy'); // ? acaba neden
								$('div[role="tooltip"]').remove();
								
								$(".TF_searchresults .tc-item").tooltip({
									html: true,
									placement: "left",
									container: ".TF_filemanagerbox"
								})
								.click(function(e) {
									if (!$(e.target).closest(".tc-item-operations").length) {
										var name = $(this).data("name");
										var basename = $(this).data("basename");
										self.TF_preview(basename, name, $(this).attr("fileid"));
									}
								})
								.dblclick(function(e) {
									if (!$(e.target).closest(".tc-item-operations").length)
									{
										$('.TF_fm_selectbut.original').click();
									}
								})
								.eq(0).click();

								$(".TF_searchresults .transicons i").click(function(e)
								{
									if ($(this).hasClass('file-not-found'))
									{
										bootbox.alert(nit.str('text_file-not-found'));
										return;
									}
									
									var row = $(this).closest(".tc-item");
									if ($(this).hasClass("fa-trash-o"))
									{
										_remove(row.attr("fileid"));
									}
									else if ($(this).hasClass("crop"))
									{
										if (!row.hasClass('item-active'))
										{
											row.click();
										}
										$.TF_imgcrop(options, {fid:row.attr("fileid")});
									}
									else if ($(this).hasClass("fileLink"))
									{
										bootbox.prompt({
											title: nit.str("text_file-url")+":",
											value: options.url.uploadDir+row.attr("type")+"/"+row.data("basename"),
											buttons: {
												cancel: { className: "d_none" },
												confirm: {
													label: nit.str("button_copy-to-clipboard"),
													className: "btn-success copybut"
												}
											},
											callback: function () {}
										})
										.on("shown.bs.modal", function() {
											$(".copybut").on('click', function () {
												navigator.clipboard.writeText(options.url.uploadDir+row.attr("type")+"/"+row.data("basename"));
											});
										});
									}
									else if ($(this).hasClass("rename"))
									{
										var file_ext = row.data("name").split('.').pop().toLowerCase()
										, file_name = row.data('name').substr(0, row.data('name').lastIndexOf('.'));

										bootbox.prompt({
											title: nit.str("text_rename"),
											value: file_name,
											buttons: {
												confirm: {
													className: "btn-success renamebut"
												}
											},
											callback: function (r) {
												if (r) {
													r += '.'+file_ext;
													nit.blockloader($(".TF_filemanagerbox .modal-dialog"));
													$.post(options.url.serverside.main+"rename", {id:row.attr("fileid"),name:r}, function() {
														nit.hideblockloader($(".TF_filemanagerbox .modal-dialog"));
														var newname = r.replace(/[*]/g, '-');
														row.data("name", newname);
														if (row.data("isprivate")=="Yes")
														{
															newname = '* '+newname;
														}
														row.find(".filetitle").text(newname);
													});
												}
											}
										});
									}
									else if ($(this).hasClass("resizeimg"))
									{
										if (!$("span.resize", row).length && !$(".resizeimg",row).hasClass("fa-spin"))
										{
											$(".resizeimg",row).addClass("fa-spin");
											
											$.getJSON(options.url.serverside.main+"img_sizes?id="+row.attr("fileid"), function(resp) {
												if (resp.code== -1 ) {
													bootbox.alert(nit.str("alert_srv-not-responding"), function() {
														window.location.reload();
													});
												}
												else if (resp.code == -2) {
													bootbox.alert(nit.str("alert_not-found"), function() {
														window.location.reload();
													});
												}
												else {
													if (resp.width>0 && resp.height>0)
													{
														var html = "<span class='tc-item-operations resize'>"+"<input title='"+nit.str('text_width')+"' class='resizeinput dst_w' onkeypress='return forcenumber(event)' value='"+resp.width+"' orig='"+resp.width+"'> <input title='"+nit.str('text_height')+"' value='"+resp.height+"' orig='"+resp.height+"' class='resizeinput dst_h mr1' onkeypress='return forcenumber(event)'> <i class='fa fa-save resize-img' onclick=\"$.TF_imgresize("+row.attr("fileid")+",$(this).siblings('.dst_w').val(),$(this).siblings('.dst_h').val())\">"+"</span>";
														
														row.append(html);
														
														$("span.resize .dst_w", row).keyup(function() {
															if ($(this).val()>0) {
																$(this).val(parseFloat($(this).val()));
																var dst_h = $(this).closest("span.resize").find(".dst_h");
																var rate = parseInt($(this).attr("orig")) / parseInt(dst_h.attr("orig"));
																dst_h.val(parseInt(parseInt($(this).val()) / rate));
															}
														});
														$("span.resize .dst_h", row).keyup(function() {
															if ($(this).val()>0) {
																$(this).val(parseFloat($(this).val()));
																var dst_w = $(this).closest("span.resize").find(".dst_w");
																var rate = parseInt($(this).attr("orig")) / parseInt(dst_w.attr("orig"));
																dst_w.val(parseInt(parseInt($(this).val()) / rate));
															}
														});
														$("span.resize", row).find("input.dst_w, input.dst_h").keyup(function(e) {
															if (e.keyCode==13)
															{
																$(this).siblings(".resize-img").click();
															}
														});
														
														$("span.filetitle", row).hide();

													}
												}
												$(".resizeimg",row).removeClass("fa-spin");
											});
										} 
										else {
											$("span.resize", row).remove();
											$("span.filetitle", row).show();
										}

									}
									else if ($(this).hasClass("compress"))
									{
										if (row.data('basename').split('.').pop().toLowerCase()=='zip')
										{
											bootbox.alert(nit.str('text_file-zipped'));
											return;
										}
										bootbox.confirm(nit.str("text_del-after-zip")+'?', function(r){
											var is_delete = (r) ? 1 : 0;
											if (!$(".compress", row).hasClass("fa-spin"))
											{
												$(".compress",row).removeClass("fa-file-archive-o")
												.addClass("fa-refresh fa-spin");

												$.getJSON(options.url.serverside.main+"zip?basename="+row.data("basename")+"&is_delete="+is_delete, function(resp) {
													if (is(resp.code))
													{
														switch (resp.code)
														{
															case -1:
																bootbox.alert(nit.str('alert_not-found'));
															break;
															case -2:
																bootbox.alert(nit.str('text_file-zipped'));
															break;
															case -3:
																bootbox.alert(nit.str('text_process-failed'));
															break;
														}
													}
													else
													{
														$.TF_autocomplete.run();
													}
													$(".compress", row).removeClass("fa-refresh fa-spin").addClass("fa-file-archive-o");
												});
											}
										});
									} // file compress
								});
								
							}
						})
					});
					
					$('.TF_reload').click(function() {
						$.TF_autocomplete.run();
					});
					
					$(".tooltips").tooltip();
					
				});
				
				$('.TF_about').click(function()
				{
					var temp_text = '<center class="TF_about_dialog">' +
						'<p><a target="_blank" href="https://tinyfinder.stemizer.net" class="fwbold">TINYFINDER</a> '+options.release+'</p>' +
						'<div class="progress TF_check4update">' +
							'<div class="progress-bar progress-bar-info progress-bar-striped active"  role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%">'+nit.str("Checking for updates...")+'</div>'+
						'</div>' +
						'&copy; 2019 <a href="https://stemizer.net" target="_blank">stemizer.net</a>' +
					'</center>';
					bootbox.alert(temp_text)
					.on('shown.bs.modal', function() {
						$.getJSON(options.url.serverside.check4update, function(resp){
							if (!resp.release)
							{
								$('.TF_check4update').text(nit.str('Congratulations, TinyFinder is up to date !'));
							}
							else
							{
								$('.TF_check4update').html('<a target="_blank" href="'+resp.url+'">New release ('+resp.release+')</a> of TinyFinder is available.');
							}
						});
					})
				});
				
			},200);

		});
						
	},
	
	TF_upload_handler : function(options, obj, action_url)
	{
		$(".TF_options_but").click(function(){
			bootbox.dialog({
				title: nit.str("text_"+options.type+"-upload-options"),
				closeButton: false,
				className: 'TF_dialog TF_upload_options_box',
				buttons: {
					okay: {
						label: nit.str("button_okay"),
						className: "btn-success",
						callback: function () {
							var yalanoldu = false;
							if ($('.TF_img_resize_type').val())
							{
								$('.TF_img_size').each(function() {
									if (!parseInt($(this).val())) {
										yalanoldu = true;
										$(this).addClass('notvalidfield').focus();
										return false;
									}
									else $(this).removeClass('notvalidfield');
								});
							}
							if (yalanoldu) return false;
							$('#TF_filetitle').removeAttr('disabled');
							var params = $('.TF_upload_options_box form').serializeObject();
							obj.data('TF_'+options.type+'_upload_options', JSON.stringify(params));
						}
					},
					close: {
						label: nit.str("button_close"),
						className:"btn-danger",
						callback: function () {
							$('#TF_filetitle').removeAttr('disabled');
						}
					}
				},
				message : ''+
				'<div class="row">  ' +
					'<div class="col-md-12"> ' +
						'<form class="form-horizontal TF_form"> ' +
							'<div class="form-group TF-img-opt"> ' +
								'<label class="col-md-4 control-label">'+nit.str("text_resizing-option")+'</label> ' +
								'<div class="col-md-4"> ' +
								'<select name="resize_type" class="form-control TF_img_resize_type">' +
									'<option value="">'+nit.str("text_resize-no")+'</option>' +
									'<option value="1">'+nit.str("text_resize-standard")+'</option>' +
									'<option value="2">'+nit.str("text_resize-keep-ratio")+'</option>' +
									'<option value="3">'+nit.str("text_resize-crop-center")+'</option>' +
									'<option value="4">'+nit.str("text_resize-fill-blanks")+'</option>' +
								'</select>' +
								'</div> ' +
							'</div> ' +
							'<div class="form-group TF-img-opt"> ' +
								'<label class="col-md-4 control-label">'+nit.str("text_width")+'</label> ' +
								'<div class="col-md-4"> ' +
								'<input readonly onkeypress="return forcenumber(event)" type="text" class="form-control TF_img_size" name="width" value="" autocomplete="off" />' +
								'</div> ' +
							'</div> ' +
							'<div class="form-group TF-img-opt"> ' +
								'<label class="col-md-4 control-label">'+nit.str("text_height")+'</label> ' +
								'<div class="col-md-4"> ' +
								'<input readonly onkeypress="return forcenumber(event)" type="text" class="form-control TF_img_size" name="height" value="" autocomplete="off" />' +
								'</div> ' +
							'</div> ' +
							'<div class="form-group TF-img-opt"> ' +
								'<label for="create-thumb" class="col-md-4 control-label">'+nit.str("text_create-thumbs")+'</label> ' +
								'<div class="col-md-4"> ' +
								'<input name="create_thumb" id="create-thumb" value="1" type="checkbox">' +
								'</div> ' +
							'</div> ' +
							'<div class="form-group TF-file-opt"> ' +
								'<label for="add-to-zip" class="col-md-4 control-label">'+nit.str("text_zip-after-upload")+'</label> ' +
								'<div class="col-md-4"> ' +
								'<input name="add_to_zip" id="add-to-zip" value="1" type="checkbox">' +
								'</div> ' +
							'</div> ' +
							'<div class="form-group TF-file-opt"> ' +
								'<label for="zip-pass" class="col-md-4 control-label">'+nit.str("text_zip-pass")+'</label> ' +
								'<div class="col-md-4"> ' +
								'<input disabled value="'+nit.str("text_property-not-active")+'" type="text" class="form-control" name="zip_pass" id="zip-pass" autocomplete="off" maxlength="50" />' +
								'</div> ' +
							'</div> ' +
							'<div class="form-group TF-file-opt"> ' +
								'<label for="del-zipped-file" class="col-md-4 control-label">'+nit.str("text_del-after-zip")+'</label> ' +
								'<div class="col-md-4"> ' +
								'<input disabled name="del_zipped_files" id="del-zipped-file" value="1" type="checkbox">' +
								'</div> ' +
							'</div> ' +
							'<div class="form-group TF-general-opt"> ' +
								'<label for="private-upload" class="col-md-4 control-label">'+nit.str("text_private-upload")+'</label> ' +
								'<div class="col-md-4"> ' +
								'<input name="private_file" id="private-upload" value="1" title="'+nit.str("text_private-upload-title")+'" type="checkbox">' +
								'</div> ' +
							'</div> ' +
						'</form>'+
					'</div>'+
				'</div>'
			})
			.on('shown.bs.modal', function() {
				
				if (is($.TF_autocomplete))
				{
					$.TF_autocomplete.deactivate();
				}
				
				$('#TF_filetitle').attr('disabled','disabled');
				$('.TF-'+options.type+'-opt').fadeIn();
				$('.TF_upload_options_box form .form-group:not(.TF-'+options.type+'-opt,.TF-general-opt)').remove();
				
				var u_options = obj.data('TF_'+options.type+'_upload_options');
				if (u_options)
				{
					nit.set_object_values(JSON.parse(u_options), $('.TF_upload_options_box form'));
				}
				
				if (options.type == 'img')
				{
					$('.TF_img_resize_type').on('change', function() {
						if ($(this).val()) {
							$('.TF_img_size').removeAttr('readonly');
							$('.TF_img_size:first').focus();
						}
						else {
							$('.TF_img_size').attr('readonly','readonly')
							.val('');
						}
					}).change();
				}
				else
				{
					$('#add-to-zip').click(function() {
						if ($(this).prop('checked'))
							$('#del-zipped-file').removeAttr('disabled');
						else
							$('#del-zipped-file').attr('disabled','disabled');
					});
					if ($('#add-to-zip').prop('checked'))
					{
						$('#del-zipped-file').removeAttr('disabled');
					}
				}
				
			});
		});
		
		if (!obj.data('TF_'+options.type+'_upload_options'))
		{
			var json = {};
			
			if (options.type == 'img' || options.type == 'img_edit')
			{
				json.resize_type = (options.type=='img') ? options.resize_type : 2;
				json.width = options.width;
				json.height = options.height;
				if (options.type == 'img_edit' && !json.width)
					json.width = options.img_edit_params.width;
				if (options.type == 'img_edit' && !json.height)
					json.height = options.img_edit_params.height;
				if (options.type == 'img_edit')
				{
					json.width *= 1.5;
					json.height *= 1.5;
				}
				json.create_thumb = (!options.create_thumb) ? 0 : 1;
			}
			else if (options.type == 'file')
			{
				json.add_to_zip = (!options.add_to_zip) ? 0 : 1;
				json.del_zipped_files = (!options.del_zipped_files) ? 0 : 1;
			}
			json.private_file = (!options.private_file) ? 0 : 1;
			
			obj.data('TF_'+options.type+'_upload_options', JSON.stringify(json));
			
		}

		var TF_last_resp
		
		,TF_resp_msg = ''
		
		,progress_bar = {};
		progress_bar.item = '' +
			'<div class="progress p_relative" id="TF_item_progress">' +
				'<div class="progress-bar progress-bar-info progress-bar-striped active"  role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width:0px"></div>' +
			'</div>';
		
		progress_bar.general = '' +
			'<div class="progress p_relative" id="TF_progress">' +
				'<div class="progress-bar progress-bar-info progress-bar-striped active"  role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width:0px"></div>' +
			'</div>';
			
		$('.TF_drag_here, .TF_searchresults').TF_drag_drop({
			 // localOptions - start
			url: action_url,
			
			precheck: function()
			{	
				$('.TF_drag_here').data('default_text', $('.TF_drag_here').text())
				.addClass('cwait')
				.html('<img class="mt-3" src="'+nit.loading.spinner+'"> '+nit.str('text_upload-precheck'));
				return true;
			},
			
			begin: function(xhr, current, files)
			{
				switch ($('.TF_drag_here').attr('area'))
				{
					case 'uploadbox':
						if (!$('#TF_item_progress').length)
						{
							$('.TF_drag_here').after(progress_bar.general)
							.after(progress_bar.item);
						}
					break;

					case 'archive':
						if (!$('.TF_upload_progress_dialog').length)
						{
							bootbox.dialog({
								closeButton: false,
								title: '', //'Uploading files'+((files.length>1)?'s':''),
								className: 'TF_upload_progress_dialog',
								message: progress_bar.item + progress_bar.general
							});
						}
					break;
				}

				$('#TF_item_progress').show();
				if (files>1) $('#TF_progress').show();
				
				$('.TF_drag_here').data('upload_progress', 1)
				.text(nit.str('text_uploading-files'));
				
			},
			
			success: function(xhr, current, files) {
				
				var response = xhr.responseText;
				
				try
				{
					response = $.parseJSON(response);
				} 
				catch(e)
				{
					TF_resp_msg += "Response error! " + htmlspecialchars(xhr.file.name) + "<br />";
					return;
				}
				
				if (!isempty(response.tinyfinder.msg))
				{
					TF_resp_msg += response.tinyfinder.msg + "<br />";
				}
				
				if (!response.file)
				{
					TF_resp_msg += "Response error! " + htmlspecialchars(xhr.file.name) + "<br />";	
				}
				
				TF_last_resp = response.tinyfinder;

			},

			error: function(xhr, current, files) {
				TF_resp_msg += "Request error! " + htmlspecialchars(xhr.file.name) + "<br />";
			},

			abort: function(xhr, current, files) {
				TF_resp_msg += "Request aborted! " + htmlspecialchars(xhr.file.name) + "<br />";
			},
			
			finish: function(files_count)
			{
				$('#TF_progress, #TF_item_progress').hide()
				.find('.progress-bar').css({width: 0}).text('');
		
				var pre_error = '';
				if (TF_request_errors.ext.length)
				{
					pre_error += '<u>'+nit.str("alert_type-not-allowed")+'</u><br />';
					for (var i in TF_request_errors.ext)
					{
						pre_error += '<b>&middot;</b> '+ TF_request_errors.ext[i]+ '<br />';
					}
				}
				
				if (TF_request_errors.size.length)
				{
					var max_file_size = (options.type=='img') ? tf_dyn.cnf.max_img_size : tf_dyn.cnf.max_file_size;
					pre_error += '<u>'+nit.str("alert_larger-than-max-size")+' ('+roundfilesize(max_file_size)+')</u><br />';
					for (var i in TF_request_errors.size) {
						pre_error += '<b>&middot;</b> '+ TF_request_errors.size[i]+ '<br />';
					}
				}
				
				if (trim(pre_error))
				{
					TF_resp_msg = pre_error + "<br>" + TF_resp_msg;
				}
				
				TF_resp_msg = rtrim(TF_resp_msg, '<br>');

				switch ($('.TF_drag_here').attr('area'))
				{
					case 'uploadbox':
						if (files_count>1 
							&& TF_request_errors.ext.length<files_count && TF_request_errors.size.length<files_count
						){
							if (TF_resp_msg)
							{
								options.pre_alert = base64_encode(TF_resp_msg);
								TF_resp_msg = '';
							}
							$.TF_filemanager(options, obj);
						}
						else
						{
							if (TF_resp_msg)
							{
								bootbox.alert(TF_resp_msg);
								TF_resp_msg = '';
							}
							else
							{
								$.TF_uploadboxResponse(TF_last_resp);
							}
						}
					break;

					case 'archive':
						if (TF_resp_msg)
						{
							bootbox.alert(TF_resp_msg);
							TF_resp_msg = '';
						}
						$('.TF_upload_progress_dialog').removeClass('fade').modal('hide');
						$.TF_autocomplete.run();
					break;
				}
				
				$('.TF_drag_here').text($('.TF_drag_here').data('default_text'))
				.removeData('upload_progress')
				.removeClass('cwait');
		
				$('.TF_uploadingfile').val('');
		
				TF_request_errors.ext = [];
				TF_request_errors.size = [];
				
				TF_request_total_size = 0;
				TF_request_loaded_size = 0;
			},
			
			tf_type: options.type,
			tf_obj: obj

		}, // localOptions - finish

		{ // remoteOptions - start
			ajax: {
				url: options.url.serverside.upload+"remote?type=img",
				
				success: function(response) {
					
					if (!trim(response))
					{
						bootbox.alert("Response error! " + htmlspecialchars(response.name));
					}
					else if (response.ismulti)
					{	
						if ($('.TF_filemanagerbox').length)
						{
							if (isempty(response.msg))
								$.TF_autocomplete.run();
							else
								bootbox.alert(base64_decode(response.msg));
						}
						else
						{
							if (!isempty(response.msg))
							{
								options.pre_alert = response.msg;
							}
							$.TF_filemanager(options, obj);
						}
					}
					else
					{
						if (!isempty(response.msg))
						{
							bootbox.alert(response.msg);
						}
						else if ($('.TF_filemanagerbox').length)
						{
							$.TF_autocomplete.run();
						}
						else
						{
							response.obj = obj;
							$.TF_uploadboxResponse(response);
						}
					}
					
					nit.hideblockloader($(".bootbox .modal-dialog"));
					$('.TF_searchresults > ul').removeClass('list_drag');
					TF_resp_msg = '';
					
				}
			}
			// remoteOptions - finish
		});
		
		
	}, // $.TF_upload_handler
	
	TF_uploadboxResponse : function (data, vars)
	{
		var options = nit.extendObj(this.TF_defaults(), vars);
		//
		nit.hideblockloader($(".modal-dialog"));
		if (!isempty(data.msg))
		{
			$("#TF_basic_alert").html("<i class='fa fa-warning'></i> "+data.msg).addClass("alert-danger");
		}
		else
		{
			var ext = data.basename.split('.').pop().toLowerCase(),
			type = ext == "gif" || ext == "jpg" || ext == "png" ? "img" : "file";
	
			if (!data.obj)
			{
				data.obj = $("[tf-tmp-id='"+data.id+"']");
			}
			
			data.obj.val(data.name).popover('destroy')
			.next().val(data.basename);
	
			setTimeout(function(){
				if (type=='img' || ext=='swf')
				{
					data.obj.popover({
						content : showfile(options.url.uploadDir+type+"/"+data.basename, ((data.width>250)?250:data.width), null, 'uploadedimg'),
						html: true
					});
				}
				else if (options.common_exts.indexOf(ext) > -1) {
					data.obj.popover({
						content : showfile(options.url.assets+"images/format_"+ext+".png", 96, 96, "TF_fm_preview",1),
						html:true
					});
				}
				else {
					data.obj.popover({
						content : '<div class="p_relative">'+
							showfile(options.url.assets+"images/format_other.png", 96, 96, "TF_fm_preview")+
							'<span class="ext_popover">'+ext.toUpperCase()+'</span>'+
						'</div>',
						html:true
					});
				}
			},500);

			nit.hideallmodals();
		}
	},
	
	TF_smartuploadResponse : function (data, vars)
	{
		var options = nit.extendObj(this.TF_defaults(), vars)
		,wrapper = $('.TF_imgedit.'+data.id);
		//
		if (!isempty(data.msg))
		{
			$('img',wrapper).attr('src', options.url.assets+'images/imgedit.png');
			bootbox.alert(data.msg);
		}
		else
		{
			$('img',wrapper).attr('src',options.url.uploadDir+'img/'+data.basename);
			$.TF_imgcrop(options, data, true);
		}
		$('img',wrapper).removeClass('onprogress');
		wrapper.removeClass('cwait')
		$('.TF_img_edit_fileinput',wrapper).show().val('')
		.removeData('processing')
		.removeAttr('name');
		$('span',wrapper).html(nit.str('text_upload-img'));
		wrapper.prev().val(data.basename);
		if (isempty(data.msg) && data.callback)
		{
			eval('var callback='+base64_decode(data.callback));
			callback.call(this, data);
		}
		
	},
	
	TF_imgcrop : function(vars, data, is_smartupload)
	{
		var options = nit.extendObj(this.TF_defaults(), vars);
		
		if (is_smartupload || !$("li[fileid="+data.fid+"] .crop").hasClass("fa-spin"))
		{
			$("li[fileid="+data.fid+"] .crop").removeClass("fa-crop").addClass("fa-refresh fa-spin");
			$.getJSON(options.url.serverside.main+"img_sizes?id="+data.fid, function(resp) {
				var imgwidth = parseInt(resp.width) + 32,
				imgheight = parseInt(resp.height) + 50;
				//
				if (imgwidth < 230) imgwidth = 230;
				if (imgwidth > 800) imgwidth = 800;
				if (imgheight > 600) imgheight = 600;
				//
				var cropiframe = '<iframe frameborder="0" scrolling="no" class="TF_imgcropframe" style="width:'+(imgwidth-25)+'px;height:'+((imgheight<400) ? imgheight+25 : 400)+'px;" src="'+options.url.serverside.main+'crop?id='+data.fid+'&aspect_ratio='+data.aspect_ratio+'&smartupload='+is_smartupload+'&tid='+data.id+'"></iframe>';
				//
				bootbox.dialog({
					message: cropiframe,
					title: nit.str('text_cropping-tool'),
					className:"TF_dialog TF_cropbox"
				}).on('shown.bs.modal', function() {
					$("li[fileid="+data.fid+"] .crop").removeClass("fa-refresh fa-spin")
					.addClass("fa-crop");
					$(".TF_cropbox").css('visibility','visible')
					.find(".modal-dialog").css({"width":imgwidth+"px","height":((imgheight<=300) ? 250 : imgheight)+"px"}); //.offset({top:"0px"});
				}).on('hidden.bs.modal', function() {
					if (is($.TF_autocomplete))
					{
						$.TF_autocomplete.focus();
					}
				});

			});
		}

	}
	
});

$.fn.tinyfinder = function(vars) {
	// var options = $.extend({}, $.TF_defaults(), vars);
	var options = nit.extendObj($.TF_defaults(), vars);
	function TF(obj) {
		var self = this;
		if (options.type!='img_edit')
		{ // fileinput start
			obj.data({
				trigger   : 'hover',
				toggle    : 'popover',
				placement : 'bottom'
			})
			.addClass("fileinput cpointer tf-item")
			.attr("readonly","readonly");

			var html = '';
			html += '<input type="hidden" name="'+obj.attr("name")+'" class="tf-item">';
			html += '<span class="input-group-btn tf-item tf-actions">' +
						'<a data-placement="bottom" title="'+nit.str("button_new")+'" class="newuploadbox btn default tooltips">' +
						'<i class="fa '+((options.type=="file")?"fa-upload":"fa-picture-o")+'"></i>' +
						'</a>';

			if (options.buttons.archive)
			{
				html += '<a data-placement="bottom" title="'+nit.str("button_archive")+'" class="filemanagerbox btn default tooltips"><i class="fa fa-list-alt"></i></a>';
			}
			if (options.buttons.cancel)
			{
				html += '<a data-placement="bottom" title="'+nit.str("button_cancel")+'" class="cancelselected btn default tooltips"><i class="fa fa-times-circle"></i></a>';
			}
			if (options.buttons.download && !isempty(obj.val()))
			{
				html += '<a href="'+options.url.serverside.download+'?basename='+obj.val()+'" data-placement="bottom" title="'+nit.str("text_download")+'" class="btn default tooltips">';
					html += '<i class="fa fa-download"></i>';
				html += '</a>';
			}
			html += '</span>';

			obj.after(html);
			obj.parent().find(".tf-item").wrapAll('<div class="input-group TF_filemanagergroup" otype="'+options.type+'"></div>');

			$('.tooltips').tooltip();

			obj.click(function()
			{
				var i = randomstring(8)
				,action_url = options.url.serverside.upload+"?mode=uploadbox&type="+options.type+"&tf-tmp-id="+i;
				
				nit.fullpageloader();
				
				$.get(options.url.serverside.main+"basic?type="+options.type, function(html) {
	
					setTimeout(function() {
						nit.hideallmodals();
						obj.attr('tf-tmp-id', i)
						.popover('hide');

						bootbox.dialog({
							title: nit.str("text_upload-"+options.type),
							message: html,
							className: "TF_dialog TF_basic_upload_box",
							buttons: {
								searchinarchive: {
									label: nit.str("button_search-in-archive"),
									callback: function() {
										$.TF_filemanager(options, obj);
									}
								},
								ok: { label: nit.str("button_cancel"), className:"btn-danger" }
							}
						})
						.on('shown.bs.modal', function()
						{
							$.TF_upload_handler(options, obj, action_url);
						});
					},200);

				});

			})
			.siblings('.tf-actions').find('.newuploadbox').click(function () {
				obj.click();
			});

			obj.siblings('.tf-actions').find('.filemanagerbox').click(function () {
				$.TF_filemanager(options, obj);
			});

			obj.siblings('.tf-actions').find('.cancelselected').click(function () { 
				obj.val('').popover("destroy")
				.next().val("");
			});

			if ($.trim(obj.val()))
			{
				obj.addClass('tc-spinner');
				$.post(options.url.serverside.get_filename, {basename: obj.val()}, function(response) {
					$.TF_uploadboxResponse({
						obj : obj,
						basename : obj.val(),
						name : $.trim(response)
					});
					obj.removeClass('tc-spinner');
				});

			}
			// fileinput finish
		}
		
		else // img_edit start
		{
			var i = randomstring(8)
			,file = $('<input type="file" class="TF_img_edit_fileinput">')
			,basename = trim(obj.val())
			,iurl = options.url.uploadDir+'img/'+basename
			,aspect_ratio = ((!options.img_edit_params.width || !options.img_edit_params.height) ? 0 : options.img_edit_params.width/options.img_edit_params.height);
			
			if (!isempty(basename) && httpstatus(iurl)==404)
			{
				iurl = options.url.assets+'images/imgedit_404.png';
			}
			
			obj.hide().after(file);
			
			file.wrap('<form class="TF_imgedit '+i+'" action="'+options.url.serverside.upload+'?mode=smartupload&type=img&tf-tmp-id='+i+'&aspect_ratio='+aspect_ratio+'" target="'+i+'" method="post" enctype="multipart/form-data"></form>');
			
			var wrapper = $('.TF_imgedit.'+i);
			wrapper.after('<iframe name="'+i+'" src="" style="display:none;width:0px;height:0px;border:0px;"></iframe>')
			.bind("contextmenu",function(){return false;})
			.append('<input type="hidden" name="upload_options" class="TF_upload_options img_edit" />')
			.append('<span>'+nit.str("text_upload-img")+'</span>')
			.append('<img width="'+options.img_edit_params.width+'" height="'+options.img_edit_params.height+'" src="'+((basename) ? iurl : options.url.assets+'images/imgedit.png')+'">')
			.css({
				width : options.img_edit_params.width,
				height : options.img_edit_params.height
			})
			.find('.TF_img_edit_fileinput').css({
				width : wrapper.find('span').outerWidth(),
				height : wrapper.find('span').outerHeight()
			})
			.click(function() {
				if ($(this).data('processing')) {
					bootbox.alert(nit.str('alert_wait-current-process'));
					return false;
				}
			})
			.change(function(e) {
				var self = $(this),
				wrapper = self.parent();
				var file = $(e.currentTarget)[0].files[0]
				,ext = file.name.split('.').pop().toLowerCase()
				,reader_instance = new FileReader()
				,source;
				$('img',wrapper).addClass('onprogress');
				if (['jpg','jpeg','png','gif','png'].indexOf(ext) > -1)
				{
					reader_instance.readAsDataURL(file);
					reader_instance.onload = function(e) {
						source = e.target.result;
						$('img',wrapper).attr('src', source);
					};
					if ($.type(options.img_edit_params.callback)==='function')
					{
						var cb_encoded = base64_encode(options.img_edit_params.callback.toString());
						wrapper.append('<input name="callback" type="hidden" value="'+cb_encoded+'">');
					}
				}
				self.attr('name','upload').hide()
				.data('processing','John Murdoch');
				$('.TF_upload_options', wrapper).val(obj.data('TF_'+options.type+'_upload_options'));
				wrapper.submit()
				.addClass('cwait')
				.find('span').html(nit.str('text_processing')+' <i class="fa fa-refresh fa-spin">');
			});
			$.TF_upload_handler(options, obj);
		// img_edit finish
		}

		// nit.str yi $.getJSON ...
		
		// return self;
	};
	
	this.each(function() {
		if(!$.data(this, "tinyfinder"))
		{
			$.data(this, "tinyfinder", new TF($(this)));
		}
	});
	return this.data("tinyfinder");
};