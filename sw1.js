importScripts('js/sw-utils.js');

const CACHE_STATIC_NAME = 'static-v2';
const CACHE_DYNAMIC_NAME = 'dynamic-v1';
const CACHE_INMUTABLE_NAME = 'inmutable-v1';

// de las 3 imágenes que no están en estáticas, por lo tanto dinámicas, solo se van a cachear 2.
// es un número demasiado bajo. Lo normal es 50. Es un ejemplo para que veas que si y qué no se cachea.
const CACHE_DYNAMIC_LIMIT = 2;





self.addEventListener('install', e => {
    //se ejecuta una vez, y no vuelve a entrar hasta que no cambie de versión de caché.
    console.log('install');
    // estos archivos se cachean y no serán llamados desde internet.
    // '/img/main.jpg',
    const cacheEstatico = caches.open(CACHE_STATIC_NAME).then(

        cache => cache.addAll([
            // '/',
            'index.html',
            'manifest.json',
            'img/main.jpg',
            'css/style.css',
            'js/app.js',
            'img/no-image.png',
            'pages/sin-conexion.html',
            'js/sw-utils.js'
        ])
    );

    const cacheInmutable = caches.open(CACHE_INMUTABLE_NAME).then(
        // cache => cache.add('https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css'));
        cache => cache.addAll([
            'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css'
        ]));
    e.waitUntil(Promise.all([cacheEstatico, cacheInmutable]));
});


self.addEventListener('activate', e => {
    // revisa las versiones de cada tipo de caché, y borra las anteriores versiones. 
    // ej: CACHE_INMUTABLE_NAME='inmutable-v4' borrará inmutable-v3
    const cacheDinamico = caches.keys().then(keys => {
        keys.forEach(key => {
            if (key !== CACHE_STATIC_NAME && key.includes('static')) {
                return caches.delete(key);
            } else if (key !== CACHE_INMUTABLE_NAME && key.includes('inmutable')) {
                return caches.delete(key);
            } else if (key !== CACHE_DYNAMIC_NAME && key.includes('dynamic')) {
                return caches.delete(key);
            }
        });
    });
    e.waitUntil(cacheDinamico);
});





self.addEventListener('fetch', e => {
    // 2- Cache with Network Fallback

    // busca en caches el archivo de la petición. 
    const cacheDinamico = caches.match(e.request)
        .then(res => {
            // la encuentra. 
            if (res) return res;

            // no la encuentra.
            return fetch(e.request).then(newResp => {
                    caches.open(CACHE_DYNAMIC_NAME)
                        .then(cache => {
                            // limpio exceso de caché
                            limpiarCache(CACHE_DYNAMIC_NAME, CACHE_DYNAMIC_LIMIT);

                            // para evitar un error de chrome-extension.
                            if (!/^https?:$/i.test(new URL(e.request.url).protocol)) return;
                            // en ese cache, le sustituyo por la nueva recogida por internet.
                            cache.put(e.request, newResp);
                        }).catch(err => {
                            console.log(err);
                        });
                    return newResp.clone();
                })
                .catch(err => {
                    // cuando no la entra en cacheados ni internet

                    // console.log('err', err);
                    console.log('e', e.request);
                    //si es tipo html, muestro
                    if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
                        return caches.match('pages/sin-conexion.html');
                        //si es tipo imagen, muestro
                    } else if (e.request.destination === 'image') {
                        return caches.match('img/no-image.png');
                    }
                });
        });




    e.respondWith(cacheDinamico);



});