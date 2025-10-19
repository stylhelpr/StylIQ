// apps/frontend/api/completeUpload.ts
import axios from 'axios';
import {API_BASE_URL} from '../config/api';

type CompletePayload = {
  user_id: string;
  image_url: string; // publicUrl from step 1
  object_key: string; // objectKey from step 1
  name: string;
  main_category: string;
  tags?: string[];
};

export async function completeUpload(payload: CompletePayload) {
  const {data} = await axios.post(`${API_BASE_URL}/upload/complete`, payload);
  return data;
}
