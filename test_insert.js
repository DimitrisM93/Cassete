import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://enrofunhvkgydlcewqdj.supabase.co';
const supabaseAnonKey = 'sb_publishable_6iDSlNDgu4cj8Cd-CGbXww_cObb3rXZ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const video = {
    id: crypto.randomUUID(),
    playlist_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // dummy
    video_id: '123',
    title: 'test',
    url: 'test',
    thumbnail: 'test',
    position: 0
  };
  
  const { data, error } = await supabase
    .from('videos')
    .upsert([video]);
    
  console.log('Error:', error);
}

test();
