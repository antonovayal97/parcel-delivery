import cluster from "cluster";
import os from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`🚀 Главный процесс ${process.pid} запущен`);

  // Создаем воркеры
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`❌ Воркер ${worker.process.pid} умер`);
    console.log(`🔄 Запускаем новый воркер...`);
    cluster.fork();
  });

  // Мониторинг воркеров
  cluster.on("online", (worker) => {
    console.log(`✅ Воркер ${worker.process.pid} запущен`);
  });
} else {
  // Импортируем и запускаем приложение
  import("./index.js").then((app) => {
    console.log(`👷 Воркер ${process.pid} готов к работе`);
  });
}
