import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Input,
  Typography
} from '@mui/material';
import { useRef, useState } from 'react';
import { useAuthContext } from 'src/contexts/auth-context';
import { useAuth } from 'src/hooks/use-auth';

export const AccountProfile = () => { 
  const { user } = useAuthContext();
  const auth = useAuth();

  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleUploadClick = async () => {
    fileInputRef.current.click();
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  
    if (!selectedFile)
      return;
    try {
      await auth.updateAvatar(user, selectedFile);
    }
    catch(e) {
      console.error(e);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box
          sx={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Avatar
            src={user.avatar}
            sx={{
              height: 80,
              mb: 2,
              width: 80
            }}
          />
          <Typography
            gutterBottom
            variant="h5"
          >
            {user.firstName} {user.lastName}
          </Typography>
          <Typography
            color="text.secondary"
            variant="body2"
          >
            {user.city} {user.country}
          </Typography>
          <Typography
            color="text.secondary"
            variant="body2"
          >
            {user.timezone}
          </Typography>
        </Box>
      </CardContent>
      <Divider />
      <CardActions>
      <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <Button fullWidth variant="text" onClick={handleUploadClick}>
          Upload picture
        </Button>
      </CardActions>
    </Card>
  );
}
