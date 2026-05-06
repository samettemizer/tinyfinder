/*
 * @fileOverview tinyfilefinder plugin
 *
 * Plugin name:      tinyfilefinder
 * Menu button name: TinyFileFinder
 *
 * @author Samet TEMIZER [nestisamet@gmail.com]
 */

( function() {
	
	CKEDITOR.plugins.add( 'tinyfilefinder', {
		requires : [ 'fakeobjects' ], // dialog
		icons: 'tinyfilefinder',
		hidpi: true,
		init: function( editor ) {

			var pluginName = 'tinyfilefinder';

			// CKEDITOR.dialog.add( "tinymediaDialog", this.path + 'dialogs/foo.js' );
		
			editor.addCommand( pluginName,  {
				exec : function(editor) {
					
					$.TF_filemanager({
						type : 'file',
						rte : {
							type : 'ckeditor',
							_obj  : editor
						}
					});
					
				}
			});

			editor.ui.addButton( 'TinyFileFinder', {
				label: nit.str('button_file-archive'),
				command: pluginName,
				toolbar: 'TF,1'
			});
			
			editor.addContentsCss( this.path + 'styles/main.css' );
			
		},
		
		
		afterInit : function( editor )
		{
			var dataProcessor = editor.dataProcessor,
			   dataFilter = dataProcessor && dataProcessor.dataFilter;

			if ( dataFilter )
			{
			   dataFilter.addRules(
				  {
					 elements :
					 {
						'video' : function( element )
						{
							return editor.createFakeParserElement(element, "cke_video", "video", false)
						},
						'audio' : function( element )
						{
							return editor.createFakeParserElement(element, "cke_audio", "audio", false)
						}
					 }
				  }
				  ,10	// öncelik
			   );
			}
		}
		
	} );

} )();
