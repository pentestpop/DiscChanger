tell application "Music"
    activate
    
    -- Get or create the playlist
    set playlistName to "Current Rotation"
    set rotationPlaylist to missing value
    
    try
        set rotationPlaylist to playlist playlistName
    on error
        -- Create playlist if it doesn't exist
        set rotationPlaylist to make new playlist with properties {name:playlistName}
    end try
    
    -- Clear the playlist by removing all tracks one by one
    repeat
        set tracksToDelete to (get every file track of rotationPlaylist)
        if length of tracksToDelete is 0 then exit repeat
        delete item 1 of tracksToDelete
    end repeat
    
    -- Get all file tracks from library
    set allTracks to (get every file track of library playlist 1)
    set trackCount to count of allTracks
    
    if trackCount < 50 then
        display alert "Not enough tracks" message "You have " & trackCount & " tracks. Need at least 50."
        return
    end if
    
    -- Build list of unique albums from all tracks
    set albumList to {}
    repeat with aTrack in allTracks
        set albumName to album of aTrack
        if albumName is not in albumList then
            set end of albumList to albumName
        end if
    end repeat
    
    set albumCount to count of albumList
    
    if albumCount < 10 then
        display alert "Not enough albums" message "You have " & albumCount & " albums, but need at least 10."
        return
    end if
    
    -- Randomly select 10 album names
    set selectedAlbums to {}
    repeat 10 times
        set randomIndex to (random number from 1 to albumCount)
        set randomAlbum to item randomIndex of albumList
        repeat while randomAlbum is in selectedAlbums
            set randomIndex to (random number from 1 to albumCount)
            set randomAlbum to item randomIndex of albumList
        end repeat
        set end of selectedAlbums to randomAlbum
    end repeat
    
    -- Add all tracks from selected albums to playlist
    set tracksAdded to 0
    repeat with i from 1 to count of selectedAlbums
        set currentAlbum to item i of selectedAlbums
        repeat with aTrack in allTracks
            set trackAlbum to (album of aTrack)
            if trackAlbum is equal to currentAlbum then
                try
                    duplicate aTrack to rotationPlaylist
                    set tracksAdded to tracksAdded + 1
                on error errMsg
                    display alert "Error adding track" message errMsg
                end try
            end if
        end repeat
    end repeat
    
    display alert "Rotation Updated" message "Added " & tracksAdded & " tracks from 10 random albums to Current Rotation playlist."
end tell
