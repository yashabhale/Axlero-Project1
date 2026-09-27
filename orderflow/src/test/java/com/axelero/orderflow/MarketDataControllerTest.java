package com.axelero.orderflow;

import com.axelero.orderflow.config.AeronConfig.MessagePublisher;
import com.axelero.orderflow.model.OrderMessage;
import com.axelero.orderflow.service.MatchingEngineService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
@Import(MatchingEngineService.class)
class MarketDataControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MessagePublisher messagePublisher;

    @Test
    void shouldExposeBookEndpoint() throws Exception {
        mockMvc.perform(get("/api/book/ACME"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldAcceptOrderSubmission() throws Exception {
        String payload = "{\n" +
                "  \"schemaVersion\": 1,\n" +
                "  \"type\": \"NEW_ORDER\",\n" +
                "  \"clientOrderId\": \"web-001\",\n" +
                "  \"instrumentId\": \"ACME\",\n" +
                "  \"side\": \"BUY\",\n" +
                "  \"orderType\": \"LIMIT\",\n" +
                "  \"quantity\": 100,\n" +
                "  \"limitPrice\": 101000,\n" +
                "  \"timeInForce\": \"GTC\",\n" +
                "  \"clientTimestamp\": \"2026-09-27T10:30:00.000Z\"\n" +
                "}";

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isAccepted());
    }
}
