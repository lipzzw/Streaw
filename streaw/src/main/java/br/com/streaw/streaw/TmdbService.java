package br.com.streaw.streaw;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class TmdbService {

    @Value("${tmdb.read-access-token}")
    private String token;

    private final RestClient cliente;

    public TmdbService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000); // 5 segundos para conectar
        factory.setReadTimeout(5000);    // 5 segundos para ler a resposta

        this.cliente = RestClient.builder()
                .requestFactory(factory)
                .build();
    }

    public RespostaBuscaTmdb buscarFilmes(String consulta) {
        return cliente.get()
                .uri("https://api.themoviedb.org/3/search/movie?query={consulta}", consulta)
                .header("Authorization", "Bearer " + token)
                .retrieve()
                .body(RespostaBuscaTmdb.class);
    }
}