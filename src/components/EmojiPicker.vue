<script setup>
import { ref } from 'vue';

const emojis = ref(['😀', '😂', '😍', '😎', '😢', '😡', '👍', '👎', '🙏', '🎉']);
const emit = defineEmits(['select', 'close']);

const selectEmoji = (emoji) => {
  emit('select', emoji);
};
</script>

<template>
  <div class="emoji-picker bg-white p-4 rounded-lg shadow-lg">
    <div class="grid grid-cols-5 gap-2">
      <button
        v-for="emoji in emojis"
        :key="emoji"
        @click="selectEmoji(emoji)"
        class="text-2xl"
      >
        {{ emoji }}
      </button>
    </div>
    <button @click="$emit('close')" class="mt-4 text-purple-600 hover:text-purple-800">
      Close
    </button>
  </div>
</template>

<style scoped>
.emoji-picker {
  max-width: 200px;
}
</style>