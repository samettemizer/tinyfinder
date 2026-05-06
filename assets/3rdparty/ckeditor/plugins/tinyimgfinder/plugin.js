/*
 * @fileOverview tinyimgfinder plugin
 *
 * Plugin name:      tinyimgfinder
 * Menu button name: TinyImgFinder
 * 
 * @author Samet TEMIZER [nestisamet@gmail.com]
 */

( function() {
	
	CKEDITOR.plugins.add( 'tinyimgfinder', {
		// requires : [ 'dialog' ],
		icons: 'tinyimgfinder',
		hidpi: true,
		init: function( editor ) {

			var pluginName = 'tinyimgfinder';

			// CKEDITOR.dialog.add( "tinymediaDialog", this.path + 'dialogs/foo.js' );
		
			editor.addCommand( pluginName,  {
				exec : function(editor) {
					
					$.TF_filemanager({
						type : 'img',
						rte : {
							type : 'ckeditor',
							_obj  : editor
						}
					});
					
				}
			});

			editor.ui.addButton( 'TinyImgFinder', {
				label: nit.str('button_img-archive'),
				command: pluginName,
				toolbar: 'TF,0'
			});
			
		}
		
		
	} );
	

} )();
