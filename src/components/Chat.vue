<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase, getOrCreateUser } from '../lib/supabase';
import { socket, connectSocket, disconnectSocket } from '../lib/socket';

const messages = ref([]);
const newMessage = ref('');
const messageContainer = ref(null);
const currentUser = ref(null);
const username = ref('');
const showUsernameForm = ref(true);

const scrollToBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
  }
};

const loadMessages = async () => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, chat_users(username)')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading messages:', error);
    return;
  }

  messages.value = data;
  scrollToBottom();
};

const sendMessage = async () => {
  if (!newMessage.value.trim() || !currentUser.value) return;

  socket.emit('chat_message', newMessage.value);
  newMessage.value = '';
};

const joinChat = async () => {
  if (!username.value.trim()) return;
  
  try {
    currentUser.value = await getOrCreateUser(username.value);
    connectSocket(currentUser.value.username);
    showUsernameForm.value = false;
    await loadMessages();
  } catch (error) {
    console.error('Error joining chat:', error);
  }
};

onMounted(() => {
  socket.on('new_message', (message) => {
    messages.value.push(message);
    scrollToBottom();
  });
});

onUnmounted(() => {
  disconnectSocket();
});
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <!-- Username Form -->
    <div v-if="showUsernameForm" class="flex items-center justify-center h-full">
      <div class="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Join Chat</h2>
        <form @submit.prevent="joinChat" class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
              Choose a username
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              required
              placeholder="Enter your username"
              class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Join Chat
          </button>
        </form>
      </div>
    </div>

    <!-- Chat Interface -->
    <div v-else class="flex flex-col h-full">
      <!-- Messages Container -->
      <div 
        ref="messageContainer"
        class="flex-1 overflow-y-auto p-4 space-y-4"
      >
        <div 
          v-for="message in messages" 
          :key="message.id"
          class="flex items-start space-x-2"
        >
          <div class="bg-white p-3 rounded-lg shadow-sm max-w-[80%]">
            <p class="text-sm font-semibold text-gray-700">
              {{ message.chat_users?.username || 'Unknown User' }}
            </p>
            <p class="text-gray-800">{{ message.content }}</p>
            <p class="text-xs text-gray-500 mt-1">
              {{ new Date(message.created_at).toLocaleTimeString() }}
            </p>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div class="border-t bg-white p-4">
        <form @submit.prevent="sendMessage" class="flex space-x-2">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Type your message..."
            class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  </div>
</template>