package br.com.streaw.streaw;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Filme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long tmdbId;
    private String titulo;
    private int ano;

    public Filme(){

    }

    public Filme(String titulo, int ano){
        this.titulo = titulo;
        this.ano = ano;
    }
    public Long getId(){
        return id;
    }

    public Long getTmdbId() {
        return tmdbId;
    }
    public String getTitulo(){
        return titulo;
    }

    public int getAno(){
        return ano;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setTmdbId(Long tmdbId) {
        this.tmdbId = tmdbId;
    }
    public void setTitulo(String titulo){
        this.titulo = titulo;
    }

    public void setAno(int ano){
        this.ano = ano;
    }
}
