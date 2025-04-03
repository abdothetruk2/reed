<script setup>
import { ref } from 'vue';
import { 
  HomeIcon, 
  ChatBubbleLeftIcon, 
  UserGroupIcon, 
  CogIcon,
  UserCircleIcon
} from '@heroicons/vue/24/outline';

const menuItems = ref([
  { name: 'Home', icon: HomeIcon },
  { name: 'Messages', icon: ChatBubbleLeftIcon },
  { name: 'Public', icon: UserGroupIcon },
  { name: 'Settings', icon: CogIcon },
]);

const activeItem = ref('Messages');
</script>

<template>
  <div class="h-screen w-64 bg-gray-900 text-white flex flex-col">
    <!-- Profile Section -->
    <div class="p-4 border-b border-gray-800">
      <div class="flex items-center space-x-3">
        <UserCircleIcon class="h-10 w-10 text-gray-300" />
        <div>
          <h3 class="font-semibold">Mero<3</h3>
          <p class="text-sm text-gray-400">Online</p>
        </div>
      </div>  
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4">
      <ul class="space-y-2">
        <li v-for="item in menuItems" :key="item.name">
          <a 
            href="#"
            @click="activeItem = item.name"
            :class="[
              'flex items-center space-x-3 p-2 rounded-lg transition-colors',
              activeItem === item.name ? 'bg-blue-600' : 'hover:bg-gray-800'
            ]"
          >
            <component :is="item.icon" class="h-5 w-5" />
            <span>{{ item.name }}</span>
          </a>
        </li>
      </ul>
    </nav>

    <!-- User Actions -->
    <div class="p-4 border-t border-gray-800">
      <button class="w-full flex items-center justify-center space-x-2 p-2 rounded-lg hover:bg-gray-800 transition-colors">
        <CogIcon class="h-5 w-5" />
        <span>Settings</span>
      </button>
    </div>
  </div>
</template>