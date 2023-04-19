
function getFiles(){
    var selectedFolder = new Folder;
    selectedFolder = Folder.selectDialog("Open a folder");

    if(selectedFolder == null) {
            alert("No folder selected", "Please run again");
            return false;
    }

    var files = selectedFolder.getFiles();

    if(files.length < 1) {
            alert("No files detected", "Select a valid folder");
    }
    
    var productFolders = [];
    for (var i=0; i < files.length; i++){
        if(files[i].name.substring(0, 2) == "B0"){
                productFolders.push(files[i]);
            }
    }
    return productFolders;
}
                      
function getNeccessaryFiles(folder) {
    var thisName;
    var paths = [];
    
    var selectedFolder = new Folder(folder);
    var files = selectedFolder.getFiles();
    // check all the files in the folder the user selected. If it's an image or a video, we want to keep it, and use its path
    for(var i = 0; i < files.length; i++) {
        thisName = files[i].name;
        if(thisName.substring(thisName.length-3, thisName.length).toLowerCase() == "mp4" || thisName.substring(thisName.length-3, thisName.length).toLowerCase() == "jpg") {
            paths.push(files[i].fsName);
            }
        }
    return paths;
}

function getImportedProjectItems(projectItem) {
    var projectVideos = [];
    var projectImages = [];
    var thisName;
    // get all the videos
    for(var i = 0; i < projectItem.children.numItems; i++) {
        thisName = projectItem.children[i].name;
        if(thisName.substring(thisName.length - 3, thisName.length).toLowerCase() == "mp4") {
            projectVideos.push(projectItem.children[i]);
        }
    }
    
    for(var i = 0; i < projectItem.children.numItems; i++) {
        thisName = projectItem.children[i].name;
        if(thisName.substring(thisName.length - 3, thisName.length).toLowerCase() == "jpg") {
            projectImages.push(projectItem.children[i]);
        }
    }
    return [projectVideos, projectImages];
}

function searchForBinWithName(nameToFind) {
   var numItemsAtRoot = app.project.rootItem.children.numItems;
   var foundBin = 0;

   for (
     var i = 0;
     numItemsAtRoot > 0 && i < numItemsAtRoot && foundBin === 0;
     i++
   ) {
     var currentItem = app.project.rootItem.children[i];
     if (
       currentItem &&
       currentItem.name == nameToFind &&
       currentItem.type == 2
     ) {
       foundBin = currentItem;
     }
   }
   return foundBin;
 }




var project = app.project;
var projectItem = project.rootItem;
app.enableQE();


var script = new File($.fileName);
var scriptFolder = new Folder(script.path);
var scriptFolderFiles = scriptFolder.getFiles();
var sequenceFile;
var exportPresetFile;
    // check all the files in the folder the user selected. If it's an image or a video, we want to keep it, and use its path
for(var i = 0; i < scriptFolderFiles.length; i++) {
        thisName = scriptFolderFiles[i].name;
        if(thisName == "productSeqTemplate.sqpreset"){
                sequenceFile = scriptFolderFiles[i].fsName;
            }
        else if (thisName == "outputPreset.epr"){
                exportPresetFile = scriptFolderFiles[i].fsName;
            }
}

var productFolders = getFiles();
for (var productID = 0; productID < productFolders.length; productID++){
    var filePaths = getNeccessaryFiles(productFolders[productID]); 
    project.importFiles(filePaths);
    var importedFolder = projectItem.createBin("Imported");
    var importedFiles = getImportedProjectItems(projectItem);
    var videoFiles = importedFiles[0];
    var imageFiles = importedFiles[1];
    
    var finalVidExists = false;
    for(var e = 0; e < videoFiles.length; e++) {
      if (videoFiles[e].name.substring(0, 2) == "B0"){
                 finalVidExists = true;
      }
    }
    if (finalVidExists == false){
        if (videoFiles.length > 0 ){
            var mainBin = searchForBinWithName("Main");
            // Create the main sequence
            // var mainSequence = project.createNewSequence("Main Sequence", "id");
            var mainSequence;
            qe.project.newSequence("Main Sequence", sequenceFile);
            var mainSequence = project.activeSequence;
            // get list of tracks
            var videoTracks = mainSequence.videoTracks;
            // get the first video track
            var videoTrackOne = videoTracks[0];
            var overlayTrack = videoTracks[1];
    
            var introVid;
            var overlayImg;
    
            var mainBinItem1 = mainBin.children[0];
            var mainBinItem2 = mainBin.children[1];
           if(mainBinItem1.name.substring(mainBinItem1.name.length-3, mainBinItem1.name.length).toLowerCase() == "mp4"){
                introVid = mainBinItem1;
                overlayImg = mainBinItem2;
            }
            else{
                overlayImg = mainBinItem1;
                introVid = mainBinItem2;
            }
    
            // Adds the intro
            introVid.setScaleToFrameSize();
            videoTrackOne.insertClip(introVid, 0);

            var endTime = videoTrackOne.clips[0].duration.seconds;
            var introEndTime = endTime;
            var noOfVideos;
            // Add other video files
            for(var e = 0; e < videoFiles.length; e++) {
                videoFiles[e].moveBin(importedFolder);
                // adds the videos
                videoFiles[e].setScaleToFrameSize();
                videoTrackOne.insertClip(videoFiles[e], endTime);
                // Updates the end time of the track
                endTime += videoTrackOne.clips[e+1].duration.seconds;
                noOfVideos = e;
            }
    
            noOfVideos++;
    
        // Add other image files
            if  (imageFiles.length > 0){
                for(var e = 0; e < imageFiles.length; e++) {
                    imageFiles[e].moveBin(importedFolder);
                    // adds the images
                    imageFiles[e].setScaleToFrameSize();
                    videoTrackOne.insertClip(imageFiles[e], endTime);
                    // Updates the end time of the track
                    endTime += videoTrackOne.clips[e+noOfVideos+1].duration.seconds;
                }
            }
    
            // adds the overlay
            overlayImg.setScaleToFrameSize();
            overlayTrack.insertClip(overlayImg, introEndTime);
            overlayTrack.clips[0].end = endTime;
    
            // saves the main sequence
            var outputFormatExtension = mainSequence.getExportFileExtension(exportPresetFile.fsName);
            var outputFile = productFolders[productID].fsName + "\\" + productFolders[productID].name + ".mp4";
            mainSequence.exportAsMediaDirect(outputFile, exportPresetFile, app.encoder.ENCODE_WORKAREA);
    
            // removes the sequence
            project.deleteSequence(mainSequence);
            // removes the bin
            importedFolder.deleteBin();
        }
        else if (imageFiles.length > 0){
                for(var e = 0; e < imageFiles.length; e++) {
                    imageFiles[e].moveBin(importedFolder);
                }
                importedFolder.deleteBin();
        }
    }
    else if (imageFiles.length > 0 ||  videoFiles.length > 0 ) {
            if (imageFiles.length > 0) {
                for(var e = 0; e < imageFiles.length; e++) {
                        imageFiles[e].moveBin(importedFolder);
                    }
            }
            if (videoFiles.length > 0) {
                for(var e = 0; e < videoFiles.length; e++) {
                    videoFiles[e].moveBin(importedFolder);
                }
            }
            importedFolder.deleteBin();
        }
}


