package br.com.streaw.streaw;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FilmeRepository extends JpaRepository<Filme, Long> {

    boolean existsByTmdbId(Long tmdbId);
}

