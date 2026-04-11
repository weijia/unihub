<template>
  <div class="counter">
    <h2>计数器</h2>
    <p class="count">{{ count }}</p>
    <div class="buttons">
      <button @click="decrement">-</button>
      <button @click="reset">重置</button>
      <button @click="increment">+</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)

const increment = () => {
  count.value++
}

const decrement = () => {
  count.value--
}

const reset = () => {
  count.value = 0
}
</script>

<style scoped>
.counter {
  padding: 20px;
  text-align: center;
}

h2 {
  color: #3b82f6;
  margin-bottom: 20px;
}

.count {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #1f2937;
}

.buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

button {
  padding: 10px 20px;
  font-size: 18px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  opacity: 0.9;
}

button:first-child {
  background-color: #ef4444;
  color: white;
}

button:nth-child(2) {
  background-color: #6b7280;
  color: white;
}

button:last-child {
  background-color: #10b981;
  color: white;
}
</style>
