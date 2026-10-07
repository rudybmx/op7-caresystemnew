FROM nginx:1.28-alpine
COPY index.html /usr/share/nginx/html/index.html
COPY assets/ /usr/share/nginx/html/assets/
COPY public/ /usr/share/nginx/html/public/
COPY design-system/ /usr/share/nginx/html/design-system/
RUN chmod -R a+rX /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
