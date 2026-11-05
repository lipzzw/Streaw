package br.com.streaw.streaw;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;


@RestController //diz ao Spring que essa classe atende requisições de uma API
@RequestMapping("/api/filmes") // define o caminho base
public class FilmeController {
    private final FilmeRepository filmeRepository;
    private final TmdbService tmdbService;

    public FilmeController(FilmeRepository filmeRepository, TmdbService tmdbService) {
        this.filmeRepository = filmeRepository;
        this.tmdbService = tmdbService;
    }

    @GetMapping//indica que o metodo responde a uma requisição HTTP GET
    public List<Filme> listar(){
        return filmeRepository.findAll();
    }

    @GetMapping("/tmdb")
    public RespostaBuscaTmdb testarTmdb(@RequestParam String consulta){
        return tmdbService.buscarFilmes(consulta);
    }

    @PostMapping//define um endpoint para requisições HTTP POST.
    public Filme cadastrar(@RequestBody Filme filme) {
        return filmeRepository.save(filme);
    }
    @PutMapping("/{id}")
    public Filme atualizar(
            @PathVariable Long id,
            @RequestBody Filme filmeAtualizado) {
        Filme filme = filmeRepository.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Filme não encontrado"));

        filme.setTitulo(filmeAtualizado.getTitulo());
        filme.setAno(filmeAtualizado.getAno());

        return filmeRepository.save(filme);
    }

    @DeleteMapping("/{id}")
    public void excluir(@PathVariable Long id) {
        filmeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Filme não encontrado"));

        filmeRepository.deleteById(id);
    }

    @PostMapping("/minha-lista")
    public Filme adicionarNaMinhaLista(@RequestBody FilmeTmdb filmeTmdb){
        if(filmeRepository.existsByTmdbId(filmeTmdb.getId())){
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este filme já está na sua lista");
        }

        Filme filme = new Filme();
        filme.setTitulo(filmeTmdb.getTitulo());
        filme.setTmdbId(filmeTmdb.getId());

        String data = filmeTmdb.getDataLancamento();

        if(data != null && data.length() >=4){
            filme.setAno(Integer.parseInt(data.substring(0, 4)));

        }
        return filmeRepository.save(filme);
    }

    @GetMapping("/tmdb/populares")
    public RespostaBuscaTmdb Listarpopulares(){
        return tmdbService.buscarFilmes("Action");
    }

    @GetMapping("/tmdb/analise")
    public List<FilmeTmdb> obterFilmesParaAnalise(@RequestParam(defaultValue = "Action") String consulta) {
        RespostaBuscaTmdb resposta = tmdbService.buscarFilmes(consulta);
        if (resposta != null && resposta.getResults() != null) {
            return resposta.getResults();
        }
        return new ArrayList<>();
    }
}
