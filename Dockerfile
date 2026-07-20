# Gunakan Nginx versi ringan
FROM nginx:alpine

# Copy file project (HTML, JS) ke folder public Nginx
COPY . /usr/share/nginx/html

# Buka port 80 di dalam container
EXPOSE 80

# Jalankan Nginx
CMD ["nginx", "-g", "daemon off;"]